import { libelleDelai } from '../pages/panier';
import { remiseDe } from './catalogue';

describe('remiseDe', () => {
  it('arrondit le pourcentage de réduction', () => {
    expect(remiseDe({ prix: 25_000, prixBarre: 35_000 })).toBe(29);
  });

  it('vaut 0 sans prix barré, ou si le prix barré est inférieur', () => {
    expect(remiseDe({ prix: 25_000, prixBarre: null })).toBe(0);
    expect(remiseDe({ prix: 25_000, prixBarre: 20_000 })).toBe(0);
  });
});

describe('libelleDelai', () => {
  it('parle en heures jusqu’à 3 jours, puis en jours', () => {
    expect(libelleDelai(48)).toBe('24 à 48 h');
    expect(libelleDelai(72)).toBe('48 à 72 h');
    expect(libelleDelai(120)).toBe('3 à 5 jours');
  });
});
