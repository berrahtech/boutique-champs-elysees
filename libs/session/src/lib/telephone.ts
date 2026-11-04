/**
 * Mêmes règles que l'API (apps/api/src/identite/telephone.ts) : numéro malien ramené
 * à +223XXXXXXXX, adresse e-mail en minuscules, ou null si la saisie n'est pas valide.
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/[\s.\-()]/g, '');
  const m = chiffres.match(/^(?:\+223|00223|223)?(\d{8})$/);
  return m && /^[2-9]/.test(m[1]) ? `+223${m[1]}` : null;
}

export function normaliserEmail(saisie: string): string | null {
  const email = saisie.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

export function normaliserIdentifiant(saisie: string): string | null {
  return saisie.includes('@') ? normaliserEmail(saisie) : normaliserTelephone(saisie);
}

export function estEmail(identifiant: string): boolean {
  return identifiant.includes('@');
}

/** « +223 •• •• •• 56 » ou « a•••@exemple.ml », pour rappeler où le code a été envoyé. */
export function masquerIdentifiant(saisie: string): string {
  const identifiant = normaliserIdentifiant(saisie);
  if (!identifiant) return saisie;
  if (estEmail(identifiant)) {
    const [local, domaine] = identifiant.split('@');
    return `${local[0]}•••@${domaine}`;
  }
  return `+223 •• •• •• ${identifiant.slice(-2)}`;
}
