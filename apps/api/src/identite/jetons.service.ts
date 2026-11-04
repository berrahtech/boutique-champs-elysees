import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { problemes } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Magasin } from '../commun/redis/magasin';
import { ObjetOtp } from './otp/otp.service';

export const DUREE_ACCES_SECONDES = 15 * 60;
const DUREE_RAFRAICHISSEMENT_JOURS = 30;
const DUREE_PREUVE_OTP_SECONDES = 10 * 60;

/** Contenu du jeton d'accès : de quoi autoriser une requête sans lire la base. */
export interface JetonAcces {
  sub: string;
  role: string;
  permissions: string[];
}

export interface PaireJetons {
  jetonAcces: string;
  jetonRafraichissement: string;
  expireDans: number;
}

const empreinte = (jeton: string) => createHash('sha256').update(jeton).digest('hex');

@Injectable()
export class JetonsService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly magasin: Magasin,
  ) {}

  /** Ouvre une session : jeton d'accès 15 min + jeton de rafraîchissement 30 jours. */
  async emettre(utilisateurId: string, appareilId?: string): Promise<PaireJetons> {
    const utilisateur = await this.prisma.utilisateur.findUniqueOrThrow({
      where: { id: utilisateurId },
      include: { role: { include: { rolePermissions: true } } },
    });
    const contenu: JetonAcces = {
      sub: utilisateur.id,
      role: utilisateur.role.nom,
      permissions: utilisateur.role.rolePermissions.map((rp) => rp.permissionCode),
    };
    const jetonRafraichissement = randomBytes(32).toString('base64url');
    await this.prisma.jetonRafraichissement.create({
      data: {
        utilisateurId,
        appareilId,
        empreinte: empreinte(jetonRafraichissement),
        expireLe: new Date(Date.now() + DUREE_RAFRAICHISSEMENT_JOURS * 86_400_000),
      },
    });
    return {
      jetonAcces: await this.jwt.signAsync(contenu, { expiresIn: DUREE_ACCES_SECONDES }),
      jetonRafraichissement,
      expireDans: DUREE_ACCES_SECONDES,
    };
  }

  /**
   * Échange un jeton de rafraîchissement contre une nouvelle paire (rotation).
   * Un jeton déjà utilisé signale un vol : toutes les sessions du compte sont fermées.
   */
  async rafraichir(jetonRafraichissement: string): Promise<PaireJetons> {
    const enregistre = await this.prisma.jetonRafraichissement.findUnique({
      where: { empreinte: empreinte(jetonRafraichissement) },
      include: { utilisateur: true },
    });
    if (!enregistre || enregistre.expireLe < new Date()) throw problemes.nonAuthentifie('Session expirée');
    if (enregistre.revoqueLe) {
      await this.revoquerTout(enregistre.utilisateurId);
      throw problemes.nonAuthentifie('Session expirée');
    }
    if (!enregistre.utilisateur.actif || enregistre.utilisateur.supprimeLe) throw problemes.compteInactif();

    // Révocation conditionnelle : deux appels simultanés ne peuvent pas tous deux réussir.
    const { count } = await this.prisma.jetonRafraichissement.updateMany({
      where: { id: enregistre.id, revoqueLe: null },
      data: { revoqueLe: new Date() },
    });
    if (count === 0) {
      await this.revoquerTout(enregistre.utilisateurId);
      throw problemes.nonAuthentifie('Session expirée');
    }
    return this.emettre(enregistre.utilisateurId, enregistre.appareilId ?? undefined);
  }

  async revoquer(jetonRafraichissement: string): Promise<void> {
    await this.prisma.jetonRafraichissement.updateMany({
      where: { empreinte: empreinte(jetonRafraichissement), revoqueLe: null },
      data: { revoqueLe: new Date() },
    });
  }

  async revoquerTout(utilisateurId: string): Promise<void> {
    await this.prisma.jetonRafraichissement.updateMany({
      where: { utilisateurId, revoqueLe: null },
      data: { revoqueLe: new Date() },
    });
  }

  /** Preuve qu'un code SMS a été validé, à usage unique, 10 minutes. */
  async emettrePreuveOtp(identifiant: string, objet: ObjetOtp): Promise<string> {
    const jti = randomUUID();
    await this.magasin.ecrire(`otp:preuve:${jti}`, '1', DUREE_PREUVE_OTP_SECONDES);
    return this.jwt.signAsync({ sub: identifiant, objet, typ: 'preuve-otp' }, { expiresIn: DUREE_PREUVE_OTP_SECONDES, jwtid: jti });
  }

  /** Consomme la preuve et renvoie l'identifiant vérifié (téléphone ou e-mail). */
  async consommerPreuveOtp(preuve: string, objet: ObjetOtp): Promise<string> {
    let contenu: { sub: string; objet: ObjetOtp; typ: string; jti: string };
    try {
      contenu = await this.jwt.verifyAsync(preuve);
    } catch {
      throw problemes.otpExpire();
    }
    if (contenu.typ !== 'preuve-otp' || contenu.objet !== objet) throw problemes.otpExpire();
    if (!(await this.magasin.supprimer(`otp:preuve:${contenu.jti}`))) throw problemes.otpExpire();
    return contenu.sub;
  }
}
