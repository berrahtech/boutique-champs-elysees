import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: 'admin', loadComponent: () => import('./tableau-de-bord/tableau-de-bord').then((m) => m.TableauDeBord) },
];
