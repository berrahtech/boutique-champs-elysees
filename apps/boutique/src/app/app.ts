import { afterNextRender, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CategorieMenu, Coordonnees, Entete, Icone, PiedDePage } from '@lce/ui';
import { Catalogue } from './donnees/catalogue';
import { Favoris } from './etat/favoris';
import { Notifications } from './etat/notifications';
import { Panier } from './etat/panier';
import { Session } from '@lce/session';

@Component({
  selector: 'lce-root',
  imports: [RouterOutlet, RouterLink, Entete, PiedDePage, Icone],
  template: `
    <lce-entete
      [categories]="categories()"
      [nbArticles]="panier.nbArticles()"
      [nbFavoris]="favoris.nombre()"
      [prenom]="session.prenom()"
      (rechercher)="rechercher($event)"
    />
    <main id="contenu" tabindex="-1">
      <router-outlet />
    </main>
    <lce-pied-de-page [coordonnees]="coordonnees" />

    <div class="notification-zone" aria-live="polite">
      @if (notifications.courante(); as n) {
        <div class="notification" role="status">
          <lce-icone nom="valide-rond" [taille]="20" />
          <span>{{ n.message }}</span>
          @if (n.lien) {
            <a [routerLink]="n.lien.url" (click)="notifications.fermer()">{{ n.lien.libelle }}</a>
          }
          <button type="button" aria-label="Fermer le message" (click)="notifications.fermer()">
            <lce-icone nom="fermer" [taille]="18" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
      outline: none;
    }
    .notification-zone {
      position: fixed;
      z-index: 20;
      right: 24px;
      bottom: 24px;
      left: 24px;
      display: flex;
      justify-content: flex-end;
      pointer-events: none;
    }
    .notification {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 440px;
      padding: 14px 16px;
      border-radius: var(--lce-rayon-carte-mobile);
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      box-shadow: var(--lce-ombre-card);
      pointer-events: auto;
      animation: apparition 180ms ease-out;
    }
    .notification lce-icone {
      color: var(--lce-gold-bright);
    }
    .notification span {
      flex: 1;
      font-weight: 600;
    }
    .notification a {
      color: var(--lce-gold-bright);
      font-weight: 700;
      white-space: nowrap;
    }
    .notification button {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
    }
    @keyframes apparition {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    @media (max-width: 520px) {
      .notification-zone {
        right: 12px;
        bottom: 12px;
        left: 12px;
      }
    }
  `,
})
export class App {
  private readonly router = inject(Router);
  protected readonly panier = inject(Panier);
  protected readonly favoris = inject(Favoris);
  protected readonly session = inject(Session);
  protected readonly notifications = inject(Notifications);

  private readonly catalogue = inject(Catalogue);
  protected readonly categories = computed<CategorieMenu[]>(() => this.catalogue.categories().map((c) => ({ slug: c.slug, nom: c.court })));

  // Provisoire : coordonnées à fournir par Les Champs Élysées.
  protected readonly coordonnees: Coordonnees = {
    telephone: '+223 20 00 00 00',
    email: 'contact@leschampselysees.ml',
    adresse: 'Bamako, Mali',
    horaires: 'Du lundi au samedi, 9 h – 19 h',
  };

  constructor() {
    // Reprise de session dans le navigateur seulement (jamais pendant le rendu serveur).
    afterNextRender(() => void this.session.reprendre());
  }

  protected rechercher(requete: string): void {
    void this.router.navigate(['/recherche'], { queryParams: { q: requete || null } });
  }
}
