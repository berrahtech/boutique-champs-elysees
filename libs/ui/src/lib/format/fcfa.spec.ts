import { formaterFcfa } from './fcfa';

describe('formaterFcfa', () => {
  it('sépare les milliers par une espace insécable et place la devise après', () => {
    expect(formaterFcfa(153600)).toBe('153\u202F600\u00A0FCFA');
  });

  it("n'ajoute pas de séparateur sous 1 000", () => {
    expect(formaterFcfa(500)).toBe('500\u00A0FCFA');
  });

  it('gère les millions et les montants négatifs (remboursements)', () => {
    expect(formaterFcfa(1284500)).toBe('1\u202F284\u202F500\u00A0FCFA');
    expect(formaterFcfa(-2500)).toBe('-2\u202F500\u00A0FCFA');
  });

  it('arrondit sans décimale', () => {
    expect(formaterFcfa(999.6)).toBe('1\u202F000\u00A0FCFA');
  });
});
