import { masquerEmail, masquerTelephone, normaliserEmail, normaliserIdentifiant, normaliserTelephone } from './telephone';

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

describe('normaliserEmail', () => {
  it('met en minuscules et retire les espaces', () => {
    expect(normaliserEmail('  Awa@Exemple.ML ')).toBe('awa@exemple.ml');
  });

  it.each(['awa', 'awa@', '@exemple.ml', 'awa@exemple', 'a b@exemple.ml'])('refuse « %s »', (saisie) => {
    expect(normaliserEmail(saisie)).toBeNull();
  });
});

describe('normaliserIdentifiant', () => {
  it('reconnaît un numéro ou une adresse', () => {
    expect(normaliserIdentifiant('76 12 34 56')).toBe('+22376123456');
    expect(normaliserIdentifiant('Awa@exemple.ml')).toBe('awa@exemple.ml');
    expect(normaliserIdentifiant('n’importe quoi')).toBeNull();
  });
});

describe('masquerEmail', () => {
  it('ne laisse voir que la première lettre et le domaine', () => {
    expect(masquerEmail('awa@exemple.ml')).toBe('a•••@exemple.ml');
  });
});
