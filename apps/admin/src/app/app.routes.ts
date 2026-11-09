import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Route, Router } from '@angular/router';
import { Session } from '@lce/session';
import { filter, map, take } from 'rxjs';

/** Accès réservé au personnel : attend la reprise de session, puis vérifie le droit d'entrée. */
const gardePersonnel: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return toObservable(session.pret).pipe(
    filter(Boolean),
    take(1),
    map(() => (session.permissions().has('tableau.voir') ? true : router.createUrlTree(['/admin/connexion']))),
  );
};

const aVenir = () => import('./pages/a-venir').then((m) => m.AVenir);
const commandes = () => import('./pages/commandes').then((m) => m.Commandes);
const clients = () => import('./pages/clients').then((m) => m.Clients);

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: 'admin/connexion', loadComponent: () => import('./pages/connexion').then((m) => m.Connexion) },
  {
    path: 'admin',
    canActivate: [gardePersonnel],
    loadComponent: () => import('./coquille').then((m) => m.Coquille),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./tableau-de-bord/tableau-de-bord').then((m) => m.TableauDeBord) },
      { path: 'finances', loadComponent: () => import('./pages/finances').then((m) => m.Finances) },
      { path: 'commandes', loadComponent: commandes },
      { path: 'commandes/:id', loadComponent: () => import('./pages/commande-detail').then((m) => m.CommandeDetail) },
      { path: 'clients', loadComponent: clients },
      { path: 'clients/:id', loadComponent: clients },
      { path: 'marketing', loadComponent: () => import('./pages/marketing').then((m) => m.Marketing) },
      { path: 'produits', loadComponent: () => import('./pages/produits').then((m) => m.Produits) },
      { path: 'produits/nouveau', loadComponent: () => import('./pages/produit-edition').then((m) => m.ProduitEdition) },
      { path: 'produits/:id', loadComponent: () => import('./pages/produit-edition').then((m) => m.ProduitEdition) },
      { path: 'stocks', loadComponent: () => import('./pages/stocks').then((m) => m.Stocks) },
      { path: 'livreurs', loadComponent: () => import('./pages/livreurs').then((m) => m.Livreurs) },
      { path: 'zones', loadComponent: () => import('./pages/zones').then((m) => m.Zones) },
      { path: 'roles', loadComponent: () => import('./pages/personnel').then((m) => m.Personnel) },
      { path: '**', loadComponent: aVenir },
    ],
  },
  { path: '**', redirectTo: 'admin' },
];
