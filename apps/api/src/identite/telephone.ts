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

/** Adresse e-mail en minuscules, ou null si elle n'a pas la bonne forme. */
export function normaliserEmail(saisie: string): string | null {
  const email = saisie.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

/** Téléphone ou e-mail : la forme canonique, ou null si la saisie n'est ni l'un ni l'autre. */
export function normaliserIdentifiant(saisie: string): string | null {
  return saisie.includes('@') ? normaliserEmail(saisie) : normaliserTelephone(saisie);
}

export function estEmail(identifiant: string): boolean {
  return identifiant.includes('@');
}

/** Masque un numéro pour l'affichage et les journaux : +223 •• •• •• 56. */
export function masquerTelephone(telephone: string): string {
  return `+223 •• •• •• ${telephone.slice(-2)}`;
}

/** Masque une adresse pour les journaux : a•••@exemple.ml. */
export function masquerEmail(email: string): string {
  const [local, domaine] = email.split('@');
  return `${local[0]}•••@${domaine}`;
}
