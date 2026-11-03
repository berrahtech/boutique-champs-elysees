/**
 * Libellés et familles de couleur des statuts serveur. Une couleur par famille :
 * bleu = en cours, vert = terminé, or = en attente, rouge = échec, gris = annulé / inactif.
 * Les valeurs reprennent les énumérations du schéma de base de données.
 */
export type FamilleStatut = 'en-cours' | 'termine' | 'attente' | 'echec' | 'inactif';

export interface Statut {
  libelle: string;
  famille: FamilleStatut;
}

export const STATUTS_COMMANDE = {
  EN_ATTENTE_PAIEMENT: { libelle: 'En attente de paiement', famille: 'attente' },
  CONFIRMEE: { libelle: 'Confirmée', famille: 'en-cours' },
  EN_PREPARATION: { libelle: 'En préparation', famille: 'en-cours' },
  EN_ATTENTE_AFFECTATION: { libelle: "En attente d'affectation", famille: 'attente' },
  AFFECTEE: { libelle: 'Affectée', famille: 'en-cours' },
  EN_COURS_LIVRAISON: { libelle: 'En cours de livraison', famille: 'en-cours' },
  LIVREE: { libelle: 'Livrée', famille: 'termine' },
  ECHEC_LIVRAISON: { libelle: 'Échec de livraison', famille: 'echec' },
  RETOUR_ENTREPOT: { libelle: "Retour à l'entrepôt", famille: 'inactif' },
  ANNULEE: { libelle: 'Annulée', famille: 'inactif' },
} as const satisfies Record<string, Statut>;

export const STATUTS_PAIEMENT = {
  EN_ATTENTE: { libelle: 'En attente', famille: 'attente' },
  REUSSI: { libelle: 'Réussi', famille: 'termine' },
  ECHOUE: { libelle: 'Échoué', famille: 'echec' },
  ANNULE: { libelle: 'Annulé', famille: 'inactif' },
  REMBOURSE: { libelle: 'Remboursé', famille: 'en-cours' },
  PARTIELLEMENT_REMBOURSE: { libelle: 'Partiellement remboursé', famille: 'en-cours' },
} as const satisfies Record<string, Statut>;

export type StatutCommande = keyof typeof STATUTS_COMMANDE;
export type StatutPaiement = keyof typeof STATUTS_PAIEMENT;
