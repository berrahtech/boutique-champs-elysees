import { Injectable } from '@nestjs/common';
import { problemes } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Magasin } from '../commun/redis/magasin';
import { ConnexionDto, DemandeOtpDto, InscriptionDto, ReinitialisationDto, VerificationOtpDto } from './dto';
import { JetonsService, PaireJetons } from './jetons.service';
import { EMPREINTE_LEURRE, hacherMotDePasse, verifierMotDePasse } from './mot-de-passe';
import { OtpService } from './otp/otp.service';

/** 5 échecs de connexion par numéro sur 15 minutes, puis blocage jusqu'à la fin de la fenêtre. */
const ECHECS_MAX = 5;
const FENETRE_ECHECS_SECONDES = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jetons: JetonsService,
    private readonly magasin: Magasin,
  ) {}

  /** Recherche un compte actif par numéro (l'unicité ne vaut que pour les comptes non supprimés). */
  private trouverParTelephone(telephone: string) {
    return this.prisma.utilisateur.findFirst({ where: { telephone, supprimeLe: null } });
  }

  async demanderOtp({ telephone, objet }: DemandeOtpDto): Promise<void> {
    const compte = await this.trouverParTelephone(telephone);
    if (objet === 'INSCRIPTION' && compte) throw problemes.compteExistant();
    // Mot de passe oublié ou connexion : on répond pareil que le compte existe ou non,
    // pour ne pas révéler quels numéros sont clients.
    if (objet !== 'INSCRIPTION' && !compte) return;
    await this.otp.envoyer(telephone, objet);
  }

  async verifierOtp({ telephone, objet, code }: VerificationOtpDto): Promise<{ preuveOtp: string }> {
    await this.otp.verifier(telephone, objet, code);
    return { preuveOtp: await this.jetons.emettrePreuveOtp(telephone, objet) };
  }

  async inscrire({ preuveOtp, nom, motDePasse, email }: InscriptionDto): Promise<PaireJetons> {
    const telephone = await this.jetons.consommerPreuveOtp(preuveOtp, 'INSCRIPTION');
    if (await this.trouverParTelephone(telephone)) throw problemes.compteExistant();
    const role = await this.prisma.role.findUniqueOrThrow({ where: { nom: 'Client' } });
    const utilisateur = await this.prisma.utilisateur.create({
      data: { telephone, nom: nom.trim(), email: email?.toLowerCase(), motDePasseHash: await hacherMotDePasse(motDePasse), roleId: role.id },
    });
    await this.prisma.journalAudit.create({
      data: { acteurId: utilisateur.id, action: 'utilisateur.cree', entite: 'utilisateur', entiteId: utilisateur.id },
    });
    return this.jetons.emettre(utilisateur.id);
  }

  async connecter({ telephone, motDePasse, code }: ConnexionDto): Promise<PaireJetons> {
    const cleEchecs = `connexion:echecs:${telephone}`;
    if (Number(await this.magasin.lire(cleEchecs)) >= ECHECS_MAX) {
      throw problemes.tropDeTentatives(await this.magasin.dureeRestante(cleEchecs));
    }

    const compte = await this.trouverParTelephone(telephone);
    const valide = await verifierMotDePasse(compte?.motDePasseHash ?? (await EMPREINTE_LEURRE), motDePasse);
    if (!compte || !valide) {
      await this.magasin.incrementer(cleEchecs, FENETRE_ECHECS_SECONDES);
      throw problemes.identifiantsInvalides();
    }
    if (!compte.actif) throw problemes.compteInactif();

    // Double authentification : le mot de passe est juste, il faut encore le code SMS.
    if (compte.deuxFacteurs) {
      if (!code) {
        await this.otp.envoyer(telephone, 'CONNEXION');
        throw problemes.otpRequis();
      }
      await this.otp.verifier(telephone, 'CONNEXION', code);
    }

    await this.magasin.supprimer(cleEchecs);
    return this.jetons.emettre(compte.id);
  }

  async reinitialiserMotDePasse({ preuveOtp, motDePasse }: ReinitialisationDto): Promise<void> {
    const telephone = await this.jetons.consommerPreuveOtp(preuveOtp, 'MOT_DE_PASSE');
    const compte = await this.trouverParTelephone(telephone);
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
