import { validerConfiguration } from './configuration';

const SECRET = 'x'.repeat(48);
const base = {
  DATABASE_URL: 'postgresql://lce:lce@localhost:5433/lce?schema=lce',
  REDIS_URL: 'redis://localhost:6380',
  JWT_SECRET: SECRET,
  OTP_POIVRE: SECRET,
  SMS_PASSERELLE: 'console',
  ORIGINES_AUTORISEES: 'http://localhost:4200, http://localhost:4300',
};

describe('validerConfiguration', () => {
  it('lit une configuration complète', () => {
    const config = validerConfiguration(base);
    expect(config.port).toBe(3000);
    expect(config.originesAutorisees).toEqual(['http://localhost:4200', 'http://localhost:4300']);
  });

  it('refuse un secret laissé à sa valeur d’exemple ou trop court', () => {
    expect(() => validerConfiguration({ ...base, JWT_SECRET: 'a-remplacer-par-une-valeur-aleatoire-de-48-octets' })).toThrow(/JWT_SECRET/);
    expect(() => validerConfiguration({ ...base, OTP_POIVRE: 'court' })).toThrow(/OTP_POIVRE/);
  });

  it('liste toutes les variables manquantes', () => {
    expect(() => validerConfiguration({})).toThrow(/DATABASE_URL[\s\S]*REDIS_URL/);
  });

  it('interdit les SMS en console en production', () => {
    expect(() => validerConfiguration({ ...base, NODE_ENV: 'production' })).toThrow(/production/);
  });
});
