import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { problemes } from '../../commun/erreurs/probleme';
import { Magasin } from '../../commun/redis/magasin';
import { PasserelleSms } from '../sms/passerelle-sms';

/** Pourquoi le code est demandé : un code ne vaut que pour son objet. */
export type ObjetOtp = 'INSCRIPTION' | 'CONNEXION' | 'MOT_DE_PASSE';

/** Règles du dossier de conception : 6 chiffres, 5 minutes, 3 essais. */
export const REGLES_OTP = {
  chiffres: 6,
  dureeSecondes: 5 * 60,
  essais: 3,
  /** Délai minimum entre deux envois au même numéro. */
  delaiRenvoiSecondes: 60,
  /** Au plus 5 envois par numéro sur 1 heure (coût des SMS, abus). */
  envoisParHeure: 5,
} as const;

const MESSAGES: Record<ObjetOtp, string> = {
  INSCRIPTION: 'Votre code Les Champs Élysées : {code}. Valable 5 minutes. Ne le partagez avec personne.',
  CONNEXION: 'Code de connexion Les Champs Élysées : {code}. Valable 5 minutes. Ne le partagez avec personne.',
  MOT_DE_PASSE: 'Code pour changer votre mot de passe Les Champs Élysées : {code}. Valable 5 minutes.',
};

interface OtpStocke {
  empreinte: string;
  essaisRestants: number;
}

@Injectable()
export class OtpService {
  private readonly poivre: string;

  constructor(
    private readonly magasin: Magasin,
    private readonly sms: PasserelleSms,
    config: ConfigService,
  ) {
    this.poivre = config.getOrThrow<string>('otpPoivre');
  }

  /** Envoie un nouveau code ; l'ancien, s'il existe, ne vaut plus rien. */
  async envoyer(telephone: string, objet: ObjetOtp): Promise<void> {
    const cleDelai = `otp:delai:${telephone}`;
    if (!(await this.magasin.ecrireSiAbsent(cleDelai, '1', REGLES_OTP.delaiRenvoiSecondes))) {
      throw problemes.tropDeTentatives(await this.magasin.dureeRestante(cleDelai));
    }
    const cleQuota = `otp:quota:${telephone}`;
    if ((await this.magasin.incrementer(cleQuota, 3600)) > REGLES_OTP.envoisParHeure) {
      throw problemes.tropDeTentatives(await this.magasin.dureeRestante(cleQuota));
    }

    const code = randomInt(0, 10 ** REGLES_OTP.chiffres)
      .toString()
      .padStart(REGLES_OTP.chiffres, '0');
    const stocke: OtpStocke = { empreinte: this.empreinte(telephone, objet, code), essaisRestants: REGLES_OTP.essais };
    await this.magasin.ecrire(this.cle(telephone, objet), JSON.stringify(stocke), REGLES_OTP.dureeSecondes);
    await this.sms.envoyer(telephone, MESSAGES[objet].replace('{code}', code));
  }

  /** Vérifie le code ; il est consommé dès qu'il est juste ou que les essais sont épuisés. */
  async verifier(telephone: string, objet: ObjetOtp, code: string): Promise<void> {
    const cle = this.cle(telephone, objet);
    const brut = await this.magasin.lire(cle);
    if (!brut) throw problemes.otpExpire();
    const stocke = JSON.parse(brut) as OtpStocke;

    const attendu = Buffer.from(stocke.empreinte, 'hex');
    const recu = Buffer.from(this.empreinte(telephone, objet, code), 'hex');
    if (timingSafeEqual(attendu, recu)) {
      await this.magasin.supprimer(cle);
      return;
    }

    const essaisRestants = stocke.essaisRestants - 1;
    if (essaisRestants <= 0) {
      await this.magasin.supprimer(cle);
      throw problemes.otpExpire();
    }
    const duree = await this.magasin.dureeRestante(cle);
    await this.magasin.ecrire(cle, JSON.stringify({ ...stocke, essaisRestants }), Math.max(duree, 1));
    throw problemes.otpInvalide(essaisRestants);
  }

  private cle(telephone: string, objet: ObjetOtp): string {
    return `otp:${objet}:${telephone}`;
  }

  // HMAC poivré : une fuite de Redis ne donne pas les codes (10^6 possibilités sinon).
  private empreinte(telephone: string, objet: ObjetOtp, code: string): string {
    return createHmac('sha256', this.poivre).update(`${objet}:${telephone}:${code}`).digest('hex');
  }
}
