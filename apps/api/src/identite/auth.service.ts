import { HttpStatus, Injectable } from '@nestjs/common';
import { Probleme, problemes } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Magasin } from '../commun/redis/magasin';
import { ConnexionDto, DemandeOtpDto, InscriptionDto, ReinitialisationDto, VerificationOtpDto } from './dto';
import { VerificateurGoogle } from './google/verificateur-google';
import { JetonsService, PaireJetons } from './jetons.service';
import { EMPREINTE_LEURRE, hacherMotDePasse, verifierMotDePasse } from './mot-de-passe';
import { OtpService } from './otp/otp.service';
import { estEmail } from './telephone';

/** 5 échecs de connexion par identifiant sur 15 minutes, puis blocage jusqu'à la fin de la fenêtre. */
const ECHECS_MAX = 5;
const FENETRE_ECHECS_SECONDES = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jetons: JetonsService,
    private readonly magasin: Magasin,
    private readonly google: VerificateurGoogle,
  ) {}

  /**
   * Compte actif par téléphone ou par e-mail. Seule une adresse VÉRIFIÉE identifie un compte :
   * une adresse simplement déclarée ne doit ouvrir ni connexion ni changement de mot de passe.
   */
  private trouver(identifiant: string) {
    return this.prisma.utilisateur.findFirst({
      where: {
        supprimeLe: null,
        ...(estEmail(identifiant) ? { email: identifiant, emailVerifieLe: { not: null } } : { telephone: identifiant }),
      },
    });
  }

  /**
   * La personne vient de prouver que l'adresse est à elle : un autre compte qui l'avait
   * seulement déclarée (sans la vérifier) la perd, plutôt que de la bloquer ou d'en hériter.
   */
  private async libererEmailNonVerifie(email: string): Promise<void> {
    await this.prisma.utilisateur.updateMany({
      where: { email, emailVerifieLe: null, supprimeLe: null, telephone: { not: null } },
      data: { email: null },
    });
  }

  async demanderOtp({ identifiant, objet }: DemandeOtpDto): Promise<void> {
    const compte = await this.trouver(identifiant);
    if (objet === 'INSCRIPTION' && compte) throw problemes.compteExistant();
    // Mot de passe oublié ou connexion : on répond pareil que le compte existe ou non,
    // pour ne pas révéler quels numéros et adresses sont clients.
    if (objet !== 'INSCRIPTION' && !compte) return;
    await this.otp.envoyer(identifiant, objet);
  }

  async verifierOtp({ identifiant, objet, code }: VerificationOtpDto): Promise<{ preuveOtp: string }> {
    await this.otp.verifier(identifiant, objet, code);
    return { preuveOtp: await this.jetons.emettrePreuveOtp(identifiant, objet) };
  }

  async inscrire({ preuveOtp, nom, motDePasse, email }: InscriptionDto): Promise<PaireJetons> {
    const identifiant = await this.jetons.consommerPreuveOtp(preuveOtp, 'INSCRIPTION');
    if (await this.trouver(identifiant)) throw problemes.compteExistant();

    const role = await this.prisma.role.findUniqueOrThrow({ where: { nom: 'Client' } });
    const motDePasseHash = await hacherMotDePasse(motDePasse);
    let contact: { telephone?: string; email?: string; emailVerifieLe?: Date };
    if (estEmail(identifiant)) {
      await this.libererEmailNonVerifie(identifiant);
      contact = { email: identifiant, emailVerifieLe: new Date() };
    } else {
      // Adresse facultative, déclarée sans preuve : elle n'identifie pas le compte.
      const declaree = email?.toLowerCase();
      const prise = declaree && (await this.prisma.utilisateur.findFirst({ where: { email: declaree, supprimeLe: null } }));
      contact = { telephone: identifiant, ...(declaree && !prise ? { email: declaree } : {}) };
    }

    const utilisateur = await this.prisma.utilisateur.create({
      data: { ...contact, nom: nom.trim(), motDePasseHash, roleId: role.id },
    });
    await this.prisma.journalAudit.create({
      data: { acteurId: utilisateur.id, action: 'utilisateur.cree', entite: 'utilisateur', entiteId: utilisateur.id },
    });
    return this.jetons.emettre(utilisateur.id);
  }

  async connecter({ identifiant, motDePasse, code }: ConnexionDto): Promise<PaireJetons> {
    const cleEchecs = `connexion:echecs:${identifiant}`;
    if (Number(await this.magasin.lire(cleEchecs)) >= ECHECS_MAX) {
      throw problemes.tropDeTentatives(await this.magasin.dureeRestante(cleEchecs));
    }

    const compte = await this.trouver(identifiant);
    const valide = await verifierMotDePasse(compte?.motDePasseHash ?? (await EMPREINTE_LEURRE), motDePasse);
    if (!compte?.motDePasseHash || !valide) {
      await this.magasin.incrementer(cleEchecs, FENETRE_ECHECS_SECONDES);
      throw problemes.identifiantsInvalides();
    }
    if (!compte.actif) throw problemes.compteInactif();

    // Double authentification : le mot de passe est juste, il faut encore le code,
    // envoyé au téléphone et à l'e-mail vérifié du compte.
    if (compte.deuxFacteurs) {
      if (!code) {
        const destinataires = [compte.telephone, compte.emailVerifieLe ? compte.email : null].filter((d): d is string => !!d);
        // Nouvel essai juste après un envoi : le code reçu reste valable, on le redemande.
        if (!(await this.otp.enCours(identifiant, 'CONNEXION'))) {
          await this.otp.envoyer(identifiant, 'CONNEXION', destinataires);
        }
        throw problemes.otpRequis();
      }
      await this.otp.verifier(identifiant, 'CONNEXION', code);
    }

    await this.magasin.supprimer(cleEchecs);
    return this.jetons.emettre(compte.id);
  }

  /**
   * Connexion ou inscription avec Google. Google garantit l'adresse (email_verified) ;
   * un compte existant n'est rattaché que si son adresse est déjà vérifiée aussi, sinon
   * quelqu'un pourrait préinscrire l'adresse d'un autre et récupérer son compte.
   */
  async connecterAvecGoogle(jeton: string): Promise<PaireJetons> {
    if (!this.google.clientId) {
      throw new Probleme('google-indisponible', HttpStatus.SERVICE_UNAVAILABLE, 'La connexion avec Google n’est pas activée');
    }
    const identite = await this.google.verifier(jeton);
    if (!identite) throw problemes.nonAuthentifie('Connexion Google refusée');
    if (!identite.email || !identite.emailVerifie) {
      throw new Probleme('google-email-non-verifie', HttpStatus.BAD_REQUEST, 'Votre adresse Google n’est pas vérifiée');
    }

    const existant =
      (await this.prisma.utilisateur.findFirst({ where: { googleId: identite.id, supprimeLe: null } })) ??
      (await this.trouver(identite.email));

    if (existant) {
      if (!existant.actif) throw problemes.compteInactif();
      // Le personnel passe par la double authentification : Google ne doit pas la contourner.
      if (existant.deuxFacteurs) {
        throw new Probleme('google-non-autorise', HttpStatus.FORBIDDEN, 'Ce compte doit se connecter avec son mot de passe et son code');
      }
      if (existant.googleId !== identite.id) {
        await this.prisma.utilisateur.update({ where: { id: existant.id }, data: { googleId: identite.id } });
        await this.prisma.journalAudit.create({
          data: { acteurId: existant.id, action: 'utilisateur.google_lie', entite: 'utilisateur', entiteId: existant.id },
        });
      }
      return this.jetons.emettre(existant.id);
    }

    await this.libererEmailNonVerifie(identite.email);
    const role = await this.prisma.role.findUniqueOrThrow({ where: { nom: 'Client' } });
    const cree = await this.prisma.utilisateur.create({
      data: {
        email: identite.email,
        emailVerifieLe: new Date(),
        googleId: identite.id,
        nom: identite.nom?.trim() || identite.email.split('@')[0],
        roleId: role.id,
      },
    });
    await this.prisma.journalAudit.create({
      data: { acteurId: cree.id, action: 'utilisateur.cree', entite: 'utilisateur', entiteId: cree.id, apres: { via: 'google' } },
    });
    return this.jetons.emettre(cree.id);
  }

  /** Ce que l'interface a besoin de savoir pour afficher les moyens de connexion. */
  options(): { googleClientId: string | null } {
    return { googleClientId: this.google.clientId };
  }

  async reinitialiserMotDePasse({ preuveOtp, motDePasse }: ReinitialisationDto): Promise<void> {
    const identifiant = await this.jetons.consommerPreuveOtp(preuveOtp, 'MOT_DE_PASSE');
    const compte = await this.trouver(identifiant);
    if (!compte) throw problemes.otpExpire();
    await this.prisma.utilisateur.update({
      where: { id: compte.id },
      data: { motDePasseHash: await hacherMotDePasse(motDePasse) },
    });
    // Un nouveau mot de passe ferme toutes les sessions ouvertes.
    await this.jetons.revoquerTout(compte.id);
    await this.prisma.journalAudit.create({
      data: { acteurId: compte.id, action: 'utilisateur.mot_de_passe_reinitialise', entite: 'utilisateur', entiteId: compte.id },
    });
  }
}
