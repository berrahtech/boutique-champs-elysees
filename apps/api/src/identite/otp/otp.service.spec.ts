import { ConfigService } from '@nestjs/config';
import { Probleme } from '../../commun/erreurs/probleme';
import { MessageEmail, PasserelleEmail } from '../email/passerelle-email';
import { MagasinMemoire } from '../../commun/redis/magasin';
import { PasserelleSms } from '../sms/passerelle-sms';
import { OtpService, REGLES_OTP } from './otp.service';

class SmsEnregistre extends PasserelleSms {
  envoyes: { telephone: string; message: string }[] = [];
  async envoyer(telephone: string, message: string) {
    this.envoyes.push({ telephone, message });
  }
  dernierCode() {
    return this.envoyes.at(-1)?.message.match(/\d{6}/)?.[0] ?? '';
  }
}

class EmailEnregistre extends PasserelleEmail {
  envoyes: MessageEmail[] = [];
  async envoyer(message: MessageEmail) {
    this.envoyes.push(message);
  }
  dernierCode() {
    return this.envoyes.at(-1)?.texte.match(/\d{6}/)?.[0] ?? '';
  }
}

const TEL = '+22376123456';
const MAIL = 'awa@exemple.ml';

function preparer() {
  const magasin = new MagasinMemoire();
  let horloge = 1_000_000;
  magasin.maintenant = () => horloge;
  const sms = new SmsEnregistre();
  const email = new EmailEnregistre();
  const config = { getOrThrow: () => 'poivre-de-test-suffisamment-long-pour-hmac' } as unknown as ConfigService;
  return {
    service: new OtpService(magasin, sms, email, config),
    magasin,
    sms,
    email,
    avancer: (secondes: number) => (horloge += secondes * 1000),
  };
}

async function codeErreur(promesse: Promise<unknown>): Promise<string> {
  try {
    await promesse;
  } catch (e) {
    return e instanceof Probleme ? e.code : String(e);
  }
  return 'aucune erreur';
}

describe('OtpService', () => {
  it('envoie un code à 6 chiffres et ne stocke pas le code en clair', async () => {
    const { service, sms, magasin } = preparer();
    await service.envoyer(TEL, 'INSCRIPTION');
    const code = sms.dernierCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(await magasin.lire(`otp:INSCRIPTION:${TEL}`)).not.toContain(code);
  });

  it('accepte le bon code une seule fois', async () => {
    const { service, sms } = preparer();
    await service.envoyer(TEL, 'INSCRIPTION');
    const code = sms.dernierCode();
    await service.verifier(TEL, 'INSCRIPTION', code);
    expect(await codeErreur(service.verifier(TEL, 'INSCRIPTION', code))).toBe('otp-expire');
  });

  it("refuse un code destiné à un autre objet", async () => {
    const { service, sms } = preparer();
    await service.envoyer(TEL, 'INSCRIPTION');
    expect(await codeErreur(service.verifier(TEL, 'MOT_DE_PASSE', sms.dernierCode()))).toBe('otp-expire');
  });

  it('épuise le code après 3 essais faux', async () => {
    const { service, sms } = preparer();
    await service.envoyer(TEL, 'CONNEXION');
    const bon = sms.dernierCode();
    const faux = bon === '000000' ? '111111' : '000000';
    expect(await codeErreur(service.verifier(TEL, 'CONNEXION', faux))).toBe('otp-invalide');
    expect(await codeErreur(service.verifier(TEL, 'CONNEXION', faux))).toBe('otp-invalide');
    expect(await codeErreur(service.verifier(TEL, 'CONNEXION', faux))).toBe('otp-expire');
    // Même le bon code ne passe plus.
    expect(await codeErreur(service.verifier(TEL, 'CONNEXION', bon))).toBe('otp-expire');
  });

  it('expire au bout de 5 minutes', async () => {
    const { service, sms, avancer } = preparer();
    await service.envoyer(TEL, 'INSCRIPTION');
    avancer(REGLES_OTP.dureeSecondes + 1);
    expect(await codeErreur(service.verifier(TEL, 'INSCRIPTION', sms.dernierCode()))).toBe('otp-expire');
  });

  it('impose 60 secondes entre deux envois, et au plus 5 envois par heure', async () => {
    const { service, avancer } = preparer();
    await service.envoyer(TEL, 'INSCRIPTION');
    expect(await codeErreur(service.envoyer(TEL, 'INSCRIPTION'))).toBe('trop-de-tentatives');
    for (let i = 0; i < 4; i++) {
      avancer(61);
      await service.envoyer(TEL, 'INSCRIPTION');
    }
    avancer(61);
    expect(await codeErreur(service.envoyer(TEL, 'INSCRIPTION'))).toBe('trop-de-tentatives');
  });

  it('envoie par e-mail quand l’identifiant est une adresse, et pas par SMS', async () => {
    const { service, sms, email } = preparer();
    await service.envoyer(MAIL, 'INSCRIPTION');
    expect(sms.envoyes).toHaveLength(0);
    expect(email.envoyes[0].destinataire).toBe(MAIL);
    expect(email.envoyes[0].html).toContain(email.dernierCode());
    await service.verifier(MAIL, 'INSCRIPTION', email.dernierCode());
  });

  it('envoie le même code au téléphone et à l’e-mail pour la double authentification', async () => {
    const { service, sms, email } = preparer();
    await service.envoyer(TEL, 'CONNEXION', [TEL, MAIL]);
    expect(sms.dernierCode()).toBe(email.dernierCode());
    await service.verifier(TEL, 'CONNEXION', email.dernierCode());
  });

  it('un code envoyé à une adresse ne vaut pas pour un numéro', async () => {
    const { service, email } = preparer();
    await service.envoyer(MAIL, 'INSCRIPTION');
    expect(await codeErreur(service.verifier(TEL, 'INSCRIPTION', email.dernierCode()))).toBe('otp-expire');
  });

  it('invalide le code précédent quand un nouveau est envoyé', async () => {
    const { service, sms, avancer } = preparer();
    await service.envoyer(TEL, 'INSCRIPTION');
    const ancien = sms.dernierCode();
    avancer(61);
    await service.envoyer(TEL, 'INSCRIPTION');
    if (ancien !== sms.dernierCode()) {
      expect(await codeErreur(service.verifier(TEL, 'INSCRIPTION', ancien))).toBe('otp-invalide');
    }
    await service.verifier(TEL, 'INSCRIPTION', sms.dernierCode());
  });
});
