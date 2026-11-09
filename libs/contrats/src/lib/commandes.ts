import type { LignePanierDemandee } from './catalogue';

export type StatutCommande =
  | 'EN_ATTENTE_PAIEMENT'
  | 'CONFIRMEE'
  | 'EN_PREPARATION'
  | 'EN_ATTENTE_AFFECTATION'
  | 'AFFECTEE'
  | 'EN_COURS_LIVRAISON'
  | 'LIVREE'
  | 'ECHEC_LIVRAISON'
  | 'RETOUR_ENTREPOT'
  | 'ANNULEE';

export type MoyenPaiement = 'ORANGE_MONEY' | 'MOOV_MONEY' | 'CARTE' | 'A_LA_LIVRAISON';
export type ModeEncaissement = 'ESPECES' | 'ORANGE_MONEY' | 'MOOV_MONEY';

/** Adresse figée dans la commande : elle ne bouge plus si le client modifie son carnet. */
export interface AdresseLivraison {
  nom: string;
  telephone: string;
  quartier: string;
  repere: string;
}

/** Ce que la boutique envoie pour passer commande. Les prix sont recalculés par le serveur. */
export interface CreationCommande {
  lignes: LignePanierDemandee[];
  codePromo?: string | null;
  zoneId: string;
  adresse: AdresseLivraison;
  note?: string | null;
  moyen: MoyenPaiement;
}

export interface LigneCommandeVue {
  produitId: string;
  slug: string | null;
  libelle: string;
  quantite: number;
  prixUnitaire: number;
  image: string | null;
}

export interface EtapeCommande {
  statut: StatutCommande;
  date: string;
  motif: string | null;
  /** Personne à l'origine du changement (vue administration seulement). */
  acteur?: string | null;
}

export interface CommandeResume {
  id: string;
  numero: string;
  statut: StatutCommande;
  moyen: MoyenPaiement;
  total: number;
  nbArticles: number;
  creeLe: string;
}

export interface CommandeClient extends CommandeResume {
  lignes: LigneCommandeVue[];
  sousTotal: number;
  fraisLivraison: number;
  remise: number;
  zone: string;
  delaiHeures: number;
  adresse: AdresseLivraison;
  noteClient: string | null;
  historique: EtapeCommande[];
}

/** Dernière adresse utilisée, pour préremplir le formulaire de commande. */
export interface PreremplissageCommande {
  nom: string;
  telephone: string;
  zoneId: string | null;
  quartier: string;
  repere: string;
}
