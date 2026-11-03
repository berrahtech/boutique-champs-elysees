import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CategorieMenu, Coordonnees, Entete, PiedDePage } from '@lce/ui';

@Component({
  selector: 'lce-root',
  imports: [RouterOutlet, Entete, PiedDePage],
  template: `
    <lce-entete [categories]="categories" [nbArticles]="0" bandeau="Livraison offerte à Bamako dès 50 000 FCFA" />
    <main>
      <router-outlet />
    </main>
    <lce-pied-de-page [coordonnees]="coordonnees" />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
    }
  `,
})
export class App {
  // Provisoire : les catégories viendront de GET /api/v1/categories (lot 1).
  protected readonly categories: CategorieMenu[] = [
    { slug: 'parfums', nom: 'Parfums' },
    { slug: 'beaute', nom: 'Beauté' },
    { slug: 'mode', nom: 'Mode' },
    { slug: 'maison', nom: 'Maison' },
  ];

  // Provisoire : coordonnées à fournir par Les Champs Élysées.
  protected readonly coordonnees: Coordonnees = {
    telephone: '+223 00 00 00 00',
    email: 'contact@exemple.ml',
    adresse: 'Bamako, Mali',
    horaires: 'Du lundi au samedi, 9 h – 19 h',
  };
}
