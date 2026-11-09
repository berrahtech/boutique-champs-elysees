import { Route } from '@angular/router';

const aVenir = () => import('./pages/a-venir').then((m) => m.AVenir);
const liste = () => import('./pages/liste').then((m) => m.Liste);
const mesCommandes = () => import('./pages/mes-commandes').then((m) => m.MesCommandes);

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
  { path: 'commande', title: 'Finaliser ma commande', loadComponent: () => import('./pages/commande').then((m) => m.PageCommande) },
  { path: 'compte/commandes', title: 'Mes commandes', loadComponent: mesCommandes },
  { path: 'compte/commandes/:numero', title: 'Suivi de commande', loadComponent: mesCommandes },
  { path: 'compte/suivi', title: 'Mes commandes', loadComponent: mesCommandes },
  {
    path: 'compte/:rubrique',
    title: 'Mon compte',
    loadComponent: aVenir,
    data: { titre: 'Mon compte', icone: 'compte' },
  },
  {
    path: 'aide',
    title: 'Aide',
    loadComponent: aVenir,
    data: { titre: 'FAQ', icone: 'information' },
  },
  {
    path: 'contact',
    title: 'Contact',
    loadComponent: aVenir,
    data: { titre: 'Contact', icone: 'support' },
  },
  {
    path: 'mentions-legales',
    title: 'Mentions légales',
    loadComponent: aVenir,
    data: { titre: 'Mentions légales', icone: 'information' },
  },
  {
    path: 'confidentialite',
    title: 'Politique de confidentialité',
    loadComponent: aVenir,
    data: { titre: 'Confidentialité', icone: 'cadenas' },
  },
  {
    path: '**',
    title: 'Page introuvable',
    loadComponent: aVenir,
    data: { titre: 'Page introuvable', texte: '', icone: 'recherche' },
  },
];
