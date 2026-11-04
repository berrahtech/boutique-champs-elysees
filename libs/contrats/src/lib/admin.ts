import type { ImagePublique } from './catalogue';

export type EtatStock = 'normal' | 'sous-seuil' | 'rupture';

/** Ligne du tableau « Produits » de l'administration. */
export interface ProduitAdmin {
  id: string;
  slug: string;
  reference: string | null;
  nom: string;
  categorie: { id: string; nom: string };
  rayon: string;
  prix: number;
  prixBarre: number | null;
  publie: boolean;
  nouveau: boolean;
  icone: string | null;
  disponible: number;
  reserve: number;
  seuilAlerte: number;
  etatStock: EtatStock;
  imagePrincipale: string | null;
}

/** Fiche complète pour l'édition. */
export interface ProduitAdminDetail extends ProduitAdmin {
  description: string;
  caracteristiques: [string, string][];
  images: ImagePublique[];
  majLe: string;
}

export interface ListeProduitsAdmin {
  produits: ProduitAdmin[];
  total: number;
  page: number;
  pages: number;
}

export interface EcritureProduit {
  nom: string;
  reference?: string | null;
  categorieId: string;
  rayon?: string;
  description?: string;
  prix: number;
  prixBarre?: number | null;
  nouveau?: boolean;
  publie?: boolean;
  icone?: string | null;
  seuilAlerte?: number;
  caracteristiques?: [string, string][];
}

export interface IndicateursStock {
  ruptures: number;
  sousSeuil: number;
  unitesReservees: number;
  produits: number;
}

export interface LigneStock {
  produitId: string;
  nom: string;
  reference: string | null;
  icone: string | null;
  disponible: number;
  reserve: number;
  seuilAlerte: number;
  etat: EtatStock;
}

export interface MouvementAdmin {
  id: string;
  date: string;
  produit: string;
  type: string;
  quantite: number;
  motif: string | null;
  acteur: string;
}

export interface VueStocks {
  indicateurs: IndicateursStock;
  lignes: LigneStock[];
  mouvements: MouvementAdmin[];
}

export interface EcritureMouvement {
  type: 'ENTREE' | 'SORTIE' | 'INVENTAIRE';
  /** ENTREE et SORTIE : quantité positive. INVENTAIRE : nouvelle quantité comptée. */
  quantite: number;
  motif?: string;
}
