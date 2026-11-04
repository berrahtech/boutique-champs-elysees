import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';
import { NomIcone } from '../icone/icones';

export interface CategorieMenu {
  slug: string;
  nom: string;
  icone?: NomIcone;
}

/**
 * En-tête du site : menu, logo, zone de livraison, recherche en pastille,
 * notifications, compte, favoris et panier ; puis barre secondaire avec le
 * panneau des catégories et les raccourcis. Sur téléphone, la recherche passe
 * sur sa propre ligne et la barre secondaire défile.
 */
@Component({
  selector: 'lce-entete',
  imports: [FormsModule, RouterLink, RouterLinkActive, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'clicDocument($event)',
    '(document:keydown.escape)': 'menuOuvert.set(false)',
  },
  template: `
    <a class="evitement" href="#contenu">Aller au contenu</a>

    <header class="barre">
      <div class="lce-conteneur ligne">
        <button
          type="button"
          class="bouton-menu"
          [attr.aria-expanded]="menuOuvert()"
          aria-controls="lce-categories"
          [attr.aria-label]="menuOuvert() ? 'Fermer le menu des catégories' : 'Ouvrir le menu des catégories'"
          (click)="menuOuvert.set(!menuOuvert())"
        >
          <lce-icone [nom]="menuOuvert() ? 'fermer' : 'menu'" [taille]="20" />
        </button>

        <a routerLink="/" class="marque" aria-label="Les Champs Élysées, accueil">
          <img src="/logo-lce.png" alt="" width="44" height="44" />
          <span>Les Champs Élysées</span>
        </a>

        <span class="zone"><lce-icone nom="localisation" [taille]="18" />Bamako, Mali</span>

        <form class="recherche" role="search" (ngSubmit)="rechercher.emit(requete.trim())">
          <button type="submit" aria-label="Lancer la recherche"><lce-icone nom="recherche" [taille]="18" /></button>
          <label for="lce-recherche" class="lce-visuellement-masque">Rechercher un produit</label>
          <input id="lce-recherche" name="q" type="search" autocomplete="off" placeholder="Rechercher un produit, une marque…" [(ngModel)]="requete" />
        </form>

        <nav class="actions" aria-label="Mon espace">
          <a routerLink="/compte/notifications" aria-label="Notifications" title="Notifications"><lce-icone nom="cloche" [taille]="22" /></a>
          <a routerLink="/compte" routerLinkActive="actif" [attr.aria-label]="prenom() ? 'Mon compte, ' + prenom() : 'Mon compte'" [title]="prenom() || 'Mon compte'">
            <lce-icone nom="compte" [taille]="22" />
          </a>
          <a routerLink="/favoris" routerLinkActive="actif" [attr.aria-label]="'Favoris, ' + nbFavoris()" title="Favoris">
            <lce-icone nom="favoris" [taille]="22" [plein]="nbFavoris() > 0" />
            @if (nbFavoris() > 0) {
              <b class="compteur" aria-hidden="true">{{ nbFavoris() }}</b>
            }
          </a>
          <a routerLink="/panier" routerLinkActive="actif" [attr.aria-label]="'Panier, ' + nbArticles() + ' article' + (nbArticles() > 1 ? 's' : '')" title="Panier">
            <lce-icone nom="panier" [taille]="22" />
            @if (nbArticles() > 0) {
              <b class="compteur" aria-hidden="true">{{ nbArticles() > 99 ? '99+' : nbArticles() }}</b>
            }
          </a>
        </nav>
      </div>

      <div class="secondaire">
        <div class="lce-conteneur secondaire-ligne">
          <button type="button" class="tout" [attr.aria-expanded]="menuOuvert()" aria-controls="lce-categories" (click)="menuOuvert.set(!menuOuvert())">
            <lce-icone nom="categories" [taille]="16" />Catégories
          </button>
          <nav aria-label="Raccourcis" class="raccourcis">
            <a routerLink="/promotions" routerLinkActive="on">Meilleures offres</a>
            <a routerLink="/boutique" [queryParams]="{ filtre: 'nouveautes' }">Nouveautés</a>
            <a routerLink="/boutique" [queryParams]="{ filtre: 'meilleures-ventes' }">Meilleures ventes</a>
            <a routerLink="/boutique" [queryParams]="{ filtre: 'petits-prix' }">Petits prix</a>
          </nav>
          <a routerLink="/aide" class="aide">Centre d'aide</a>
        </div>
      </div>

      <div class="lce-conteneur ancre">
        <nav id="lce-categories" class="panneau" [class.ouvert]="menuOuvert()" aria-label="Catégories">
          <a routerLink="/boutique" (click)="menuOuvert.set(false)"><lce-icone nom="categories" [taille]="20" />Toute la boutique</a>
          @for (categorie of categories(); track categorie.slug) {
            <a [routerLink]="['/categorie', categorie.slug]" (click)="menuOuvert.set(false)"><lce-icone [nom]="categorie.icone ?? 'divers'" [taille]="20" />{{ categorie.nom }}</a>
          }
          <a routerLink="/promotions" class="promo" (click)="menuOuvert.set(false)"><lce-icone nom="pourcentage" [taille]="20" />Promotions</a>
        </nav>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }
    .evitement {
      position: absolute;
      left: -9999px;
      z-index: 10;
      padding: 8px 16px;
      background: var(--lce-surface);
      color: var(--lce-navy);
    }
    .evitement:focus {
      left: 16px;
      top: 8px;
    }

    .barre {
      position: relative;
      z-index: 15;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .ligne {
      display: flex;
      align-items: center;
      gap: 24px;
      padding-block: 10px;
    }
    .bouton-menu {
      flex: none;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      margin-right: -4px;
      border: 0;
      border-radius: 6px;
      background: var(--lce-nuit-claire);
      color: inherit;
      cursor: pointer;
    }
    .bouton-menu:hover {
      background: var(--lce-navy-500);
    }
    .marque {
      flex: none;
      display: flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      text-decoration: none;
      font: 700 18px/22px var(--lce-police-titre);
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .marque img {
      display: block;
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .zone {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 500 13px/18px var(--lce-police-texte);
      white-space: nowrap;
    }
    .recherche {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      height: 40px;
      padding-inline: 6px 16px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-surface);
    }
    .recherche:focus-within {
      outline: 2px solid var(--lce-on-navy);
      outline-offset: 2px;
    }
    .recherche button {
      flex: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--lce-ink-muted);
      cursor: pointer;
    }
    .recherche button:hover {
      color: var(--lce-navy);
    }
    .recherche input {
      flex: 1;
      min-width: 0;
      height: 100%;
      border: 0;
      background: transparent;
      color: var(--lce-ink);
      font: 400 14px/20px var(--lce-police-texte);
      outline: none;
    }
    .recherche input::placeholder {
      color: var(--lce-ink-muted);
    }
    .actions {
      flex: none;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .actions a {
      position: relative;
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      color: var(--lce-on-navy);
    }
    .actions a:hover,
    .actions a.actif {
      background: var(--lce-nuit-claire);
    }
    .compteur {
      position: absolute;
      top: 1px;
      right: 0;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-promo);
      color: var(--lce-on-navy);
      font: 700 10px/16px var(--lce-police-texte);
      text-align: center;
    }

    .secondaire {
      background: var(--lce-navy-700);
    }
    .secondaire-ligne {
      display: flex;
      align-items: center;
      gap: 32px;
      height: 44px;
      font: 500 13px/18px var(--lce-police-texte);
    }
    .tout {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: 600 13px/18px var(--lce-police-texte);
      cursor: pointer;
    }
    .raccourcis {
      display: flex;
      gap: 20px;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .secondaire a {
      color: #dfe0f5;
      text-decoration: none;
      white-space: nowrap;
    }
    .secondaire a:hover,
    .secondaire a.on,
    .tout:hover {
      color: var(--lce-on-navy);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .aide {
      flex: none;
      margin-left: auto;
    }

    .ancre {
      position: relative;
    }
    .panneau {
      display: none;
      position: absolute;
      z-index: 15;
      top: 0;
      left: var(--lce-marge-ordinateur);
      width: 300px;
      padding: 8px;
      border-radius: 0 0 var(--lce-rayon-carte) var(--lce-rayon-carte);
      background: var(--lce-surface);
      box-shadow: 0 16px 40px rgb(20 20 70 / 22%);
    }
    .panneau.ouvert {
      display: block;
    }
    .panneau a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: var(--lce-ink);
      text-decoration: none;
      font: 500 14px/20px var(--lce-police-texte);
    }
    .panneau a lce-icone {
      color: var(--lce-navy);
    }
    .panneau a:hover {
      background: var(--lce-primaire-soft);
    }
    .panneau .promo,
    .panneau .promo lce-icone {
      color: var(--lce-promo);
    }

    @media (max-width: 1100px) {
      .zone {
        display: none;
      }
      .ligne {
        gap: 16px;
      }
    }
    @media (max-width: 767px) {
      .ligne {
        flex-wrap: wrap;
        gap: 8px 10px;
        padding-block: 8px 10px;
      }
      .bouton-menu {
        margin: 0;
      }
      .marque {
        flex: 1;
        min-width: 0;
        gap: 6px;
        font-size: 14px;
      }
      .marque span {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .marque img {
        width: 36px;
        height: 36px;
      }
      .actions {
        gap: 0;
      }
      .actions a {
        width: 36px;
        height: 36px;
      }
      .actions a:first-child {
        display: none;
      }
      .recherche {
        order: 3;
        flex-basis: 100%;
      }
      .tout,
      .aide {
        display: none;
      }
      .panneau {
        left: var(--lce-marge-mobile);
        right: var(--lce-marge-mobile);
        width: auto;
      }
    }
  `,
})
export class Entete {
  private readonly hote = inject(ElementRef<HTMLElement>);

  readonly categories = input<CategorieMenu[]>([]);
  readonly nbArticles = input(0);
  readonly nbFavoris = input(0);
  /** Prénom de la personne connectée. */
  readonly prenom = input<string | null>(null);
  readonly rechercher = output<string>();

  protected readonly menuOuvert = signal(false);
  protected requete = '';

  protected clicDocument(evenement: Event): void {
    if (!this.hote.nativeElement.contains(evenement.target as Node)) this.menuOuvert.set(false);
  }
}
