import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  // Lot 0 : la vitrine des composants tient lieu d'accueil.
  { path: '', loadComponent: () => import('./vitrine/vitrine').then((m) => m.Vitrine) },
];
