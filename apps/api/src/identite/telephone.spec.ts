import { masquerTelephone, normaliserTelephone } from './telephone';

describe('normaliserTelephone', () => {
  it.each([
    ['76123456', '+22376123456'],
    ['76 12 34 56', '+22376123456'],
    ['+223 76-12-34-56', '+22376123456'],
    ['0022376123456', '+22376123456'],
    ['22320221122', '+22320221122'],
  ])('%s → %s', (saisie, attendu) => {
    expect(normaliserTelephone(saisie)).toBe(attendu);
  });

  it.each(['', '7612345', '761234567', '+33612345678', '06123456', 'abcdefgh'])('refuse « %s »', (saisie) => {
    expect(normaliserTelephone(saisie)).toBeNull();
  });
});

describe('masquerTelephone', () => {
  it('ne laisse voir que les deux derniers chiffres', () => {
    expect(masquerTelephone('+22376123456')).toBe('+223 •• •• •• 56');
  });
});
