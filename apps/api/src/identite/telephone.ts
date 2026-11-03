/**
 * Ramène un numéro malien au format E.164 (+223 suivi de 8 chiffres).
 * Accepte les saisies courantes : « 70 00 00 01 », « 0022370000001 », « +223 70-00-00-01 ».
 * Renvoie null si ce n'est pas un numéro malien valide.
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/[\s.\-()]/g, '');
  const m = chiffres.match(/^(?:\+223|00223|223)?(\d{8})$/);
  if (!m) return null;
  // Les numéros mobiles et fixes maliens commencent par 2, 4, 5, 6, 7, 8 ou 9.
  if (!/^[2-9]/.test(m[1])) return null;
  return `+223${m[1]}`;
}

/** Masque un numéro pour l'affichage et les journaux : +223 •• •• •• 56. */
export function masquerTelephone(telephone: string): string {
  return `+223 •• •• •• ${telephone.slice(-2)}`;
}
