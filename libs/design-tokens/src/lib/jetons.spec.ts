import { jetons } from './jetons';

// Luminance relative et contraste WCAG 2.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (claire + 0.05) / (sombre + 0.05);
}

const c = jetons.couleurs;

describe('jetons de couleur', () => {
  it('sont tous des couleurs hexadécimales à 6 chiffres', () => {
    for (const valeur of Object.values(c)) expect(valeur).toMatch(/^#[0-9A-F]{6}$/i);
  });

  // Règle du dossier UX : texte ≥ 4,5:1 partout.
  it.each([
    ['ink sur surface', c.ink, c.surface],
    ['ink-muted sur surface', c['ink-muted'], c.surface],
    ['gold-text sur surface', c['gold-text'], c.surface],
    ['on-gold sur gold (bouton principal)', c['on-gold'], c.gold],
    ['on-navy sur navy', c['on-navy'], c.navy],
    ['blanc sur promo', c['on-navy'], c.promo],
    ['success sur success-soft', c.success, c['success-soft']],
    ['danger sur danger-soft', c.danger, c['danger-soft']],
    ['gold-text sur gold-soft', c['gold-text'], c['gold-soft']],
    ['navy-500 sur info-soft', c['navy-500'], c['info-soft']],
    ['ink-muted sur neutre-soft', c['ink-muted'], c['neutre-soft']],
  ])('%s atteint 4,5:1', (_, texte, fond) => {
    expect(contraste(texte, fond)).toBeGreaterThanOrEqual(4.5);
  });

  it("l'or n'est jamais lisible comme texte sur fond clair", () => {
    expect(contraste(c.gold, c.surface)).toBeLessThan(4.5);
  });
});
