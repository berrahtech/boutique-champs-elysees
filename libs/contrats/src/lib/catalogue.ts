/** Formes échangées entre l'API et les interfaces web pour le catalogue et le panier. */

export interface CategoriePublique {
  id: string;
  slug: string;
  nom: string;
  /** Libellé court de la barre des catégories. */
  court: string;
  icone: string;
  nbProduits: number;
}

export interface ImagePublique {
  id: string;
  url200: string;
  url400: string;
  url800: string;
}

export interface ProduitPublic {
  id: string;
  slug: string;
  reference: string | null;
  nom: string;
  categorie: { slug: string; nom: string };
  rayon: string;
  prix: number;
  prixBarre: number | null;
  nouveau: boolean;
  noteMoyenne: number;
  nbAvis: number;
  /** Quantité vendable à cet instant. */
  stock: number;
  icone: string | null;
  images: ImagePublique[];
  description: string;
  caracteristiques: [string, string][];
}

export type Filtre = 'tout' | 'promotions' | 'nouveautes' | 'meilleures-ventes' | 'petits-prix';
export type Tri = 'popularite' | 'nouveautes' | 'prix-croissant' | 'prix-decroissant';

export interface ResultatsCatalogue {
  produits: ProduitPublic[];
  total: number;
  page: number;
  pages: number;
  /** Nombre d'articles par slug de catégorie pour les mêmes critères, catégorie exclue. */
  parCategorie: Record<string, number>;
}

export interface DetailProduit {
  produit: ProduitPublic;
  similaires: ProduitPublic[];
}

/** Tout ce que la page d'accueil affiche, en une seule requête. */
export interface Accueil {
  nouveautes: ProduitPublic[];
  promotions: ProduitPublic[];
  meilleuresVentes: ProduitPublic[];
  populaires: ProduitPublic[];
  selectionBeaute: ProduitPublic[];
  selectionMaison: ProduitPublic[];
  prixMinSmartphones: number | null;
  remiseMaxElectromenager: number;
  remiseMax: number;
}

export interface ZonePublique {
  id: string;
  nom: string;
  frais: number;
  delaiHeures: number;
  seuilGratuit: number | null;
}

export interface LignePanierDemandee {
  produitId: string;
  quantite: number;
}

export interface LigneApercu {
  produit: ProduitPublic;
  quantite: number;
  sousTotal: number;
}

/** Montants du panier calculés par le serveur : l'interface ne fait que les afficher. */
export interface ApercuPanier {
  lignes: LigneApercu[];
  nbArticles: number;
  sousTotal: number;
  frais: number;
  remise: number;
  total: number;
  /** Code accepté, ou motif de refus à afficher. */
  codeApplique: { code: string; libelle: string } | null;
  codeRefuse: string | null;
  /** Articles retirés ou réduits faute de stock, à signaler au client. */
  ajustements: string[];
}

export interface PanierEnregistre {
  lignes: LignePanierDemandee[];
  codePromo: string | null;
}
