import { Algorithm, hash, verify } from '@node-rs/argon2';

// Argon2id, paramètres OWASP 2024 (19 Mio, 2 passes). Assez rapide pour un petit serveur.
const OPTIONS = { algorithm: Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return hash(motDePasse, OPTIONS);
}

export async function verifierMotDePasse(empreinte: string, motDePasse: string): Promise<boolean> {
  try {
    return await verify(empreinte, motDePasse);
  } catch {
    return false;
  }
}

/**
 * Empreinte d'un mot de passe impossible, vérifiée quand le numéro est inconnu :
 * la réponse prend alors autant de temps et ne révèle pas si le compte existe.
 */
export const EMPREINTE_LEURRE = hash('leurre-' + Math.random(), OPTIONS);
