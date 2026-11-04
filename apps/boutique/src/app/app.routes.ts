import { Route } from '@angular/router';

const aVenir = () => import('./pages/a-venir').then((m) => m.AVenir);
const liste = () => import('./pages/liste').then((m) => m.Liste);

// Routes de la boutique (dossier UX, § Inventaire des écrans). Les titres
// d'onglet des pages à données (produit, catégorie, recherche) sont posés par la page.
export const appRoutes: Route[] = [
  { path: '', loadComponent: () => import('./pages/accueil').then((m) => m.Accueil) },
  { path: 'boutique', loadComponent: liste, data: { mode: 'boutique' } },
  { path: 'categorie/:slug', loadComponent: liste, data: { mode: 'categorie' } },
  { path: 'promotions', loadComponent: liste, data: { mode: 'promotions' } },
  { path: 'recherche', loadComponent: liste, data: { mode: 'recherche' } },
  { path: 'produit/:slug', loadComponent: () => import('./pages/produit').then((m) => m.FicheProduit) },
  { path: 'panier', title: 'Mon panier', loadComponent: () => import('./pages/panier').then((m) => m.PagePanier) },
  { path: 'favoris', title: 'Mes favoris', loadComponent: () => import('./pages/favoris').then((m) => m.PageFavoris) },
  { path: 'connexion', title: 'Connexion', loadComponent: () => import('./pages/connexion').then((m) => m.Connexion) },
  { path: 'inscription', title: 'Créer un compte', loadComponent: () => import('./pages/inscription').then((m) => m.Inscription) },
  { path: 'compte', title: 'Mon compte', loadComponent: () => import('./pages/compte').then((m) => m.Compte) },
  {
    path: 'compte/commandes',
    title: 'Mes commandes',
    loadComponent: aVenir,
    data: { titre: 'Suivi de commande', texte: 'Le suivi de vos commandes et de vos livraisons arrive avec le module commande.', icone: 'colis' },
  },
  {
    path: 'compte/:rubrique',
    title: 'Mon compte',
    loadComponent: aVenir,
    data: { titre: 'Rubrique en préparation', texte: 'Cette rubrique de votre espace client arrive prochainement.', icone: 'compte' },
  },
  {
    path: 'aide',
    title: 'Aide',
    loadComponent: aVenir,
    data: { titre: 'Questions fréquentes', texte: 'La foire aux questions est en cours de rédaction.', icone: 'information' },
  },
  {
    path: 'contact',
    title: 'Contact',
    loadComponent: aVenir,
    data: { titre: 'Nous contacter', texte: 'Le formulaire de contact arrive bientôt. En attendant, appelez-nous ou écrivez-nous (coordonnées en bas de page).', icone: 'support' },
  },
  {
    path: 'mentions-legales',
    title: 'Mentions légales',
    loadComponent: aVenir,
    data: { titre: 'Mentions légales', texte: 'Texte à fournir par Les Champs Élysées.', icone: 'information' },
  },
  {
    path: 'confidentialite',
    title: 'Politique de confidentialité',
    loadComponent: aVenir,
    data: { titre: 'Politique de confidentialité', texte: 'Texte à fournir par Les Champs Élysées.', icone: 'cadenas' },
  },
  {
    path: '**',
    title: 'Page introuvable',
    loadComponent: aVenir,
    data: { titre: 'Page introuvable', texte: "L'adresse est peut-être incorrecte ou la page a été déplacée.", icone: 'recherche' },
  },
];
