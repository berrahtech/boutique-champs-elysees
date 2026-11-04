/**
 * Configuration lue depuis l'environnement et validée au démarrage :
 * l'API refuse de démarrer avec une variable manquante ou un secret faible.
 */
export interface Configuration {
  port: number;
  production: boolean;
  databaseUrl: string;
  redisUrl: string;
  originesAutorisees: string[];
  jwtSecret: string;
  otpPoivre: string;
  smsPasserelle: 'console';
  /** Dossier local des photos produit, servi sur /medias. */
  mediasDossier: string;
  /** SMTP des e-mails ; null = journaux (développement). */
  smtpUrl: string | null;
  emailExpediteur: string;
  /** Identifiant client OAuth ; null = bouton Google masqué. */
  googleClientId: string | null;
}

const texteOuNul = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function validerConfiguration(env: Record<string, unknown>): Configuration {
  const erreurs: string[] = [];
  const lire = (nom: string): string => {
    const valeur = env[nom];
    if (typeof valeur !== 'string' || valeur.trim() === '') {
      erreurs.push(`${nom} est obligatoire`);
      return '';
    }
    return valeur.trim();
  };

  const production = env['NODE_ENV'] === 'production';
  const jwtSecret = lire('JWT_SECRET');
  const otpPoivre = lire('OTP_POIVRE');
  for (const [nom, valeur] of [['JWT_SECRET', jwtSecret], ['OTP_POIVRE', otpPoivre]] as const) {
    if (valeur && (valeur.length < 32 || valeur.startsWith('a-remplacer'))) {
      erreurs.push(`${nom} doit être une valeur aléatoire d'au moins 32 caractères`);
    }
  }

  const smsPasserelle = lire('SMS_PASSERELLE');
  if (smsPasserelle && smsPasserelle !== 'console') {
    erreurs.push(`SMS_PASSERELLE inconnue : ${smsPasserelle}`);
  }
  if (production && smsPasserelle === 'console') {
    erreurs.push('SMS_PASSERELLE=console est interdit en production');
  }

  const configuration: Configuration = {
    port: Number(env['PORT'] ?? 3000),
    production,
    databaseUrl: lire('DATABASE_URL'),
    redisUrl: lire('REDIS_URL'),
    originesAutorisees: String(env['ORIGINES_AUTORISEES'] ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    jwtSecret,
    otpPoivre,
    smsPasserelle: 'console',
    mediasDossier: String(env['MEDIAS_DOSSIER'] ?? 'medias'),
    smtpUrl: texteOuNul(env['SMTP_URL']),
    emailExpediteur: texteOuNul(env['EMAIL_EXPEDITEUR']) ?? 'Les Champs Élysées <no-reply@leschampselysees.ml>',
    googleClientId: texteOuNul(env['GOOGLE_CLIENT_ID']),
  };

  if (production && !configuration.smtpUrl) {
    erreurs.push('SMTP_URL est obligatoire en production');
  }

  if (erreurs.length) {
    throw new Error(`Configuration invalide :\n  - ${erreurs.join('\n  - ')}`);
  }
  return configuration;
}
