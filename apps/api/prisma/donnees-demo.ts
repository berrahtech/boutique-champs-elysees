/**
 * Données de démonstration, reprises des maquettes du canevas UX (noms, prix,
 * notes). Chargées en base par prisma/seed.ts pour le développement ; le vrai
 * catalogue sera saisi dans l'administration.
 */
export interface Categorie {
  slug: string;
  nom: string;
  court: string;
  icone: string;
}

export interface Produit {
  id: string;
  slug: string;
  reference: string;
  nom: string;
  categorie: string;
  rayon: string;
  prix: number;
  prixBarre?: number;
  nouveau?: boolean;
  noteMoyenne: number;
  nbAvis: number;
  stock: number;
  ventes: number;
  icone: string;
  description: string;
  caracteristiques: [string, string][];
}

export const CATEGORIES: Categorie[] = [
  { slug: 'mode', nom: 'Mode et vêtements', court: 'Mode', icone: 'mode' },
  { slug: 'chaussures-accessoires', nom: 'Chaussures et accessoires', court: 'Chaussures', icone: 'chaussure' },
  { slug: 'parfums-cosmetiques', nom: 'Parfums et cosmétiques', court: 'Beauté', icone: 'parfum' },
  { slug: 'electromenager', nom: 'Électroménager', court: 'Électroménager', icone: 'electromenager' },
  { slug: 'telephones-informatique', nom: 'Téléphones et informatique', court: 'Téléphones & PC', icone: 'ordinateur' },
  { slug: 'electronique', nom: 'Électronique', court: 'Électronique', icone: 'ecran' },
  { slug: 'maison-decoration', nom: 'Maison et décoration', court: 'Maison', icone: 'maison' },
  { slug: 'divers', nom: 'Articles divers', court: 'Divers', icone: 'divers' },
];

type Brut = Omit<Produit, 'id' | 'slug' | 'reference' | 'description' | 'caracteristiques'> &
  Partial<Pick<Produit, 'description' | 'caracteristiques'>>;

const PREFIXES: Record<string, string> = {
  mode: 'MOD',
  'chaussures-accessoires': 'CHA',
  'parfums-cosmetiques': 'PAR',
  electromenager: 'ELM',
  'telephones-informatique': 'TEL',
  electronique: 'ELE',
  'maison-decoration': 'MAI',
  divers: 'DIV',
};

function slugifier(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/["',]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const BRUTS: Brut[] = [
  // Mode et vêtements
  { nom: 'Robe longue en wax', categorie: 'mode', rayon: 'Mode', prix: 18500, nouveau: true, noteMoyenne: 4.8, nbAvis: 24, stock: 14, ventes: 160, icone: 'mode',
    description: 'Robe longue coupée dans un wax 100 % coton aux motifs graphiques. Taille élastiquée, manches courtes, longueur cheville.',
    caracteristiques: [['Matière', '100 % coton wax'], ['Tailles', 'S au XXL'], ['Entretien', 'Lavage à 30 °C, sur l’envers']] },
  { nom: 'Chemise en lin homme', categorie: 'mode', rayon: 'Mode', prix: 12000, prixBarre: 15000, noteMoyenne: 4.2, nbAvis: 56, stock: 22, ventes: 310, icone: 'mode' },
  { nom: 'Ensemble boubou brodé', categorie: 'mode', rayon: 'Mode', prix: 35000, noteMoyenne: 4.7, nbAvis: 31, stock: 8, ventes: 240, icone: 'mode',
    description: 'Ensemble boubou en bazin riche, broderie ton sur ton au col et aux poignets. Livré avec le pantalon assorti.' },
  { nom: 'Pagne tissé Faso Dan Fani', categorie: 'mode', rayon: 'Mode', prix: 9500, nouveau: true, noteMoyenne: 4.6, nbAvis: 9, stock: 30, ventes: 45, icone: 'mode' },
  { nom: 'Tee-shirt coton bio', categorie: 'mode', rayon: 'Mode', prix: 4500, noteMoyenne: 4.1, nbAvis: 88, stock: 60, ventes: 420, icone: 'mode' },

  // Chaussures et accessoires
  { nom: 'Baskets cuir blanches', categorie: 'chaussures-accessoires', rayon: 'Chaussures', prix: 27500, noteMoyenne: 4.8, nbAvis: 212, stock: 18, ventes: 980, icone: 'chaussure',
    description: 'Baskets basses en cuir pleine fleur, semelle en caoutchouc cousue. Un classique qui va avec tout.',
    caracteristiques: [['Matière', 'Cuir pleine fleur'], ['Pointures', '38 au 46'], ['Semelle', 'Caoutchouc cousu']] },
  { nom: 'Sac cabas en cuir', categorie: 'chaussures-accessoires', rayon: 'Accessoires', prix: 25000, prixBarre: 35000, noteMoyenne: 4.4, nbAvis: 128, stock: 6, ventes: 520, icone: 'sac' },
  { nom: 'Montre homme acier', categorie: 'chaussures-accessoires', rayon: 'Accessoires', prix: 38000, noteMoyenne: 4.3, nbAvis: 36, stock: 11, ventes: 190, icone: 'horloge' },
  { nom: 'Sandales cuir femme', categorie: 'chaussures-accessoires', rayon: 'Chaussures', prix: 13500, noteMoyenne: 4.5, nbAvis: 64, stock: 0, ventes: 280, icone: 'chaussure' },
  { nom: 'Ceinture cuir tressé', categorie: 'chaussures-accessoires', rayon: 'Accessoires', prix: 7500, prixBarre: 9500, noteMoyenne: 4.0, nbAvis: 19, stock: 25, ventes: 75, icone: 'sac' },

  // Parfums et cosmétiques
  { nom: 'Parfum oriental 100 ml', categorie: 'parfums-cosmetiques', rayon: 'Parfums', prix: 32000, nouveau: true, noteMoyenne: 4.4, nbAvis: 41, stock: 15, ventes: 230, icone: 'parfum',
    description: 'Eau de parfum aux notes d’oud, d’ambre et de rose. Sillage intense, tenue longue durée.',
    caracteristiques: [['Contenance', '100 ml'], ['Famille', 'Orientale boisée'], ['Concentration', 'Eau de parfum']] },
  { nom: 'Coffret soin visage', categorie: 'parfums-cosmetiques', rayon: 'Cosmétiques', prix: 14500, noteMoyenne: 4.8, nbAvis: 187, stock: 20, ventes: 860, icone: 'parfum' },
  { nom: 'Eau de parfum florale 50 ml', categorie: 'parfums-cosmetiques', rayon: 'Parfums', prix: 27000, nouveau: true, noteMoyenne: 4.5, nbAvis: 22, stock: 12, ventes: 140, icone: 'parfum' },
  { nom: 'Huile de karité pure 250 ml', categorie: 'parfums-cosmetiques', rayon: 'Soin corps', prix: 6500, noteMoyenne: 4.9, nbAvis: 143, stock: 40, ventes: 640, icone: 'parfum',
    description: 'Beurre de karité pur, non raffiné, pressé à froid au Mali. Nourrit la peau et les cheveux secs.' },
  { nom: 'Palette maquillage 12 teintes', categorie: 'parfums-cosmetiques', rayon: 'Maquillage', prix: 11000, prixBarre: 13500, noteMoyenne: 4.2, nbAvis: 37, stock: 16, ventes: 210, icone: 'eclat' },
  { nom: 'Coffret cadeau parfum', categorie: 'parfums-cosmetiques', rayon: 'Parfums', prix: 29000, noteMoyenne: 4.6, nbAvis: 28, stock: 9, ventes: 170, icone: 'cadeau' },

  // Électroménager
  { nom: 'Climatiseur split 1,5 CV', categorie: 'electromenager', rayon: 'Climatisation', prix: 235000, prixBarre: 265000, noteMoyenne: 4.3, nbAvis: 33, stock: 5, ventes: 120, icone: 'electromenager',
    description: 'Climatiseur split mural 12 000 BTU, classe énergétique A, mode nuit silencieux. Pose possible sur rendez-vous à Bamako.',
    caracteristiques: [['Puissance', '1,5 CV · 12 000 BTU'], ['Classe énergétique', 'A'], ['Garantie', '12 mois']] },
  { nom: 'Réfrigérateur 2 portes 260 L', categorie: 'electromenager', rayon: 'Froid', prix: 289000, noteMoyenne: 4.4, nbAvis: 21, stock: 4, ventes: 95, icone: 'electromenager' },
  { nom: 'Mixeur blender 1,5 L', categorie: 'electromenager', rayon: 'Petit électroménager', prix: 19900, noteMoyenne: 4.2, nbAvis: 98, stock: 30, ventes: 450, icone: 'electromenager' },
  { nom: 'Ventilateur sur pied', categorie: 'electromenager', rayon: 'Ventilation', prix: 24500, prixBarre: 28000, noteMoyenne: 4.1, nbAvis: 76, stock: 0, ventes: 390, icone: 'electromenager' },
  { nom: 'Fer à repasser vapeur', categorie: 'electromenager', rayon: 'Petit électroménager', prix: 14000, nouveau: true, noteMoyenne: 4.0, nbAvis: 12, stock: 18, ventes: 60, icone: 'electromenager' },

  // Téléphones et informatique
  { nom: 'Smartphone 6,7" 128 Go', categorie: 'telephones-informatique', rayon: 'Smartphones', prix: 115000, nouveau: true, noteMoyenne: 4.3, nbAvis: 67, stock: 12, ventes: 410, icone: 'mobile',
    description: 'Grand écran 6,7 pouces, double SIM, batterie 5 000 mAh et appareil photo 50 Mpx. Livré avec chargeur et câble USB-C.',
    caracteristiques: [['Écran', '6,7 pouces'], ['Stockage', '128 Go (extensible)'], ['Batterie', '5 000 mAh'], ['Appareil photo', '50 Mpx'], ['SIM', 'Double SIM'], ['Contenu de la boîte', 'Téléphone, chargeur, câble USB-C']] },
  { nom: 'Smartphone 6,5" 128 Go', categorie: 'telephones-informatique', rayon: 'Smartphones', prix: 92000, prixBarre: 105000, noteMoyenne: 4.2, nbAvis: 54, stock: 9, ventes: 350, icone: 'mobile' },
  { nom: 'Ordinateur portable 15"', categorie: 'telephones-informatique', rayon: 'Informatique', prix: 345000, noteMoyenne: 4.4, nbAvis: 45, stock: 3, ventes: 140, icone: 'ordinateur' },
  { nom: 'Écouteurs sans fil', categorie: 'telephones-informatique', rayon: 'Accessoires', prix: 15000, noteMoyenne: 4.3, nbAvis: 73, stock: 35, ventes: 560, icone: 'mobile' },
  { nom: 'Coque et verre trempé 6,7"', categorie: 'telephones-informatique', rayon: 'Accessoires', prix: 4500, noteMoyenne: 4.1, nbAvis: 120, stock: 80, ventes: 700, icone: 'securite' },

  // Électronique
  { nom: 'Téléviseur LED 43"', categorie: 'electronique', rayon: 'Télévision', prix: 149000, prixBarre: 165000, noteMoyenne: 4.7, nbAvis: 19, stock: 7, ventes: 130, icone: 'ecran',
    description: 'Téléviseur LED Full HD 43 pouces, 3 entrées HDMI, tuner TNT intégré. Fixation murale fournie.' },
  { nom: 'Enceinte Bluetooth', categorie: 'electronique', rayon: 'Audio', prix: 22000, noteMoyenne: 4.4, nbAvis: 58, stock: 21, ventes: 330, icone: 'ecran' },
  { nom: 'Barre de son 2.1', categorie: 'electronique', rayon: 'Audio', prix: 59000, nouveau: true, noteMoyenne: 4.5, nbAvis: 8, stock: 6, ventes: 40, icone: 'ecran' },
  { nom: 'Onduleur 1 000 VA', categorie: 'electronique', rayon: 'Énergie', prix: 48000, prixBarre: 55000, noteMoyenne: 4.6, nbAvis: 27, stock: 10, ventes: 160, icone: 'ecran' },

  // Maison et décoration
  { nom: 'Lampe de table laiton', categorie: 'maison-decoration', rayon: 'Décoration', prix: 16500, nouveau: true, noteMoyenne: 4.8, nbAvis: 12, stock: 13, ventes: 70, icone: 'maison' },
  { nom: 'Parure de lit 2 places', categorie: 'maison-decoration', rayon: 'Linge de maison', prix: 21000, noteMoyenne: 4.4, nbAvis: 44, stock: 17, ventes: 260, icone: 'maison' },
  { nom: 'Service à thé 6 verres', categorie: 'maison-decoration', rayon: 'Art de la table', prix: 8500, noteMoyenne: 4.7, nbAvis: 91, stock: 28, ventes: 480, icone: 'maison' },
  { nom: 'Tapis berbère 160 × 230', categorie: 'maison-decoration', rayon: 'Décoration', prix: 65000, prixBarre: 79000, noteMoyenne: 4.5, nbAvis: 15, stock: 4, ventes: 55, icone: 'maison' },

  // Articles divers
  { nom: 'Coffret cadeau', categorie: 'divers', rayon: 'Articles divers', prix: 9500, noteMoyenne: 4.2, nbAvis: 15, stock: 24, ventes: 110, icone: 'cadeau' },
  { nom: 'Sac de voyage 60 L', categorie: 'divers', rayon: 'Bagagerie', prix: 23000, noteMoyenne: 4.3, nbAvis: 22, stock: 12, ventes: 90, icone: 'sac' },
  { nom: 'Lampe solaire rechargeable', categorie: 'divers', rayon: 'Énergie', prix: 7000, nouveau: true, noteMoyenne: 4.6, nbAvis: 39, stock: 50, ventes: 300, icone: 'eclat' },
];

export const PRODUITS: Produit[] = BRUTS.map((b, i) => {
  const categorie = CATEGORIES.find((c) => c.slug === b.categorie)!;
  return {
    ...b,
    id: `p${String(i + 1).padStart(3, '0')}`,
    slug: slugifier(b.nom),
    reference: `LCE-${PREFIXES[b.categorie]}-${String(10000 + i * 137).padStart(5, '0')}`,
    description:
      b.description ??
      `${b.nom}, sélectionné par nos équipes dans le rayon ${categorie.nom.toLowerCase()}. Produit neuf, livré à domicile par nos livreurs.`,
    caracteristiques: b.caracteristiques ?? [['Rayon', b.rayon], ['État', 'Neuf']] as [string, string][],
  };
});
