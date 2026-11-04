/**
 * Même règle que l'API (apps/api/src/identite/telephone.ts) : numéro malien
 * ramené à +223XXXXXXXX, ou null s'il n'est pas valide.
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/[\s.\-()]/g, '');
  const m = chiffres.match(/^(?:\+223|00223|223)?(\d{8})$/);
  return m && /^[2-9]/.test(m[1]) ? `+223${m[1]}` : null;
}
