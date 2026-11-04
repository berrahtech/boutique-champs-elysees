import { RenderMode, ServerRoute } from '@angular/ssr';

// Rendu serveur à chaque requête : le catalogue et les prix changent, et les
// moteurs de recherche reçoivent une page complète.
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
