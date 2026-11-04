import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';

export interface CategorieMenu {
  slug: string;
  nom: string;
}

/**
 * En-tête du site (maquette « Header ») : bandeau or (livraison, liens d'aide),
 * logo et signature, recherche, Compte / Favoris / Panier avec pastille,
 * barre des catégories + Promotions. Sur téléphone, les catégories se replient
 * derrière le bouton menu et la recherche passe sur sa propre ligne.
 */
@Component({
  selector: 'lce-entete',
  imports: [FormsModule, RouterLink, RouterLinkActive, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="evitement" href="#contenu">Aller au contenu</a>
    <div class="bandeau">
      <div class="lce-conteneur bandeau-ligne">
        <span class="bandeau-message"><lce-icone nom="livraison" [taille]="16" />{{ bandeau() }}</span>
        <nav aria-label="Aide" class="bandeau-liens">
          <a routerLink="/compte/commandes">Suivre ma commande</a>
          <a routerLink="/aide">Aide</a>
          <a routerLink="/contact">Contact</a>
        </nav>
      </div>
    </div>

    <header class="barre">
      <div class="lce-conteneur ligne">
        <button
          type="button"
          class="menu-mobile"
          [attr.aria-expanded]="menuOuvert()"
          aria-controls="lce-categories"
          [attr.aria-label]="menuOuvert() ? 'Fermer le menu des catégories' : 'Ouvrir le menu des catégories'"
          (click)="menuOuvert.set(!menuOuvert())"
        >
          <lce-icone [nom]="menuOuvert() ? 'fermer' : 'menu'" />
        </button>

        <a routerLink="/" class="marque" aria-label="Les Champs Élysées, accueil">
          <img src="/logo-lce.png" alt="" width="56" height="56" />
          <span class="marque-texte">
            <span class="marque-nom">Les Champs Élysées</span>
            <span class="marque-slogan">Shoppez mieux, vivez mieux !</span>
          </span>
        </a>

        <form class="recherche" role="search" (ngSubmit)="rechercher.emit(requete.trim())">
          <label for="lce-recherche" class="lce-visuellement-masque">Rechercher un produit</label>
          <input
            id="lce-recherche"
            name="q"
            type="search"
            autocomplete="off"
            placeholder="Rechercher un produit, une marque, une référence…"
            [(ngModel)]="requete"
          />
          <button type="submit" aria-label="Lancer la recherche"><lce-icone nom="recherche" [taille]="22" /></button>
        </form>

        <nav class="actions" aria-label="Mon espace">
          <a routerLink="/compte" routerLinkActive="actif">
            <lce-icone nom="compte" />
            <span>{{ prenom() || 'Compte' }}</span>
          </a>
          <a routerLink="/favoris" routerLinkActive="actif">
            <lce-icone nom="favoris" />
            <span>Favoris</span>
            @if (nbFavoris() > 0) {
              <b class="compteur" aria-hidden="true">{{ nbFavoris() }}</b>
            }
          </a>
          <a routerLink="/panier" routerLinkActive="actif" [attr.aria-label]="'Panier, ' + nbArticles() + ' article' + (nbArticles() > 1 ? 's' : '')">
            <lce-icone nom="panier" />
            <span>Panier</span>
            @if (nbArticles() > 0) {
              <b class="compteur" aria-hidden="true">{{ nbArticles() > 99 ? '99+' : nbArticles() }}</b>
            }
          </a>
        </nav>
      </div>

      <nav id="lce-categories" class="categories" [class.ouvert]="menuOuvert()" aria-label="Catégories">
        <div class="lce-conteneur categories-ligne">
          <a routerLink="/boutique" routerLinkActive="on" (click)="menuOuvert.set(false)" class="tout">
            <lce-icone nom="menu" [taille]="18" />Toute la boutique
          </a>
          @for (categorie of categories(); track categorie.slug) {
            <a [routerLink]="['/categorie', categorie.slug]" routerLinkActive="on" (click)="menuOuvert.set(false)">
              {{ categorie.nom }}
            </a>
          }
          <a routerLink="/promotions" routerLinkActive="on" class="promotions" (click)="menuOuvert.set(false)">
            <span>Promotions</span>
          </a>
        </div>
      </nav>
    </header>
  `,
  styles: `
    @use 'typographie' as t;

    :host {
      display: block;
    }
    .evitement {
      position: absolute;
      left: -9999px;
      z-index: 10;
      padding: 8px 16px;
      background: var(--lce-gold);
      color: var(--lce-on-gold);
    }
    .evitement:focus {
      left: 16px;
      top: 8px;
    }

    .bandeau {
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      font: 600 12px/20px var(--lce-police-texte);
    }
    .bandeau-ligne {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px 24px;
      padding-block: 6px;
    }
    .bandeau-message {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .bandeau-liens {
      display: flex;
      gap: 20px;
    }
    .bandeau a {
      color: inherit;
      text-decoration: none;
    }
    .bandeau a:hover {
      text-decoration: underline;
    }

    .barre {
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .ligne {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px 32px;
      padding-block: 14px;
    }
    .marque {
      display: flex;
      align-items: center;
      gap: 12px;
      color: inherit;
      text-decoration: none;
    }
    .marque img {
      display: block;
      width: 56px;
      height: 56px;
      object-fit: contain;
    }
    .marque-texte {
      display: flex;
      flex-direction: column;
    }
    .marque-nom {
      font: 600 22px/26px var(--lce-police-titre);
      white-space: nowrap;
    }
    .marque-slogan {
      font: 600 11px/16px var(--lce-police-texte);
      letter-spacing: 0.08em;
      color: var(--lce-gold-bright);
    }

    .recherche {
      flex: 1 1 320px;
      min-width: 0;
      display: flex;
      height: 48px;
      background: var(--lce-surface);
      border-radius: var(--lce-rayon-controle);
      overflow: hidden;
    }
    .recherche:focus-within {
      outline: 2px solid var(--lce-gold-bright);
      outline-offset: 2px;
    }
    .recherche input {
      @include t.texte-body;
      flex: 1;
      min-width: 0;
      border: 0;
      padding: 0 16px;
      color: var(--lce-ink);
      background: transparent;
      outline: none;
    }
    .recherche button {
      display: grid;
      place-items: center;
      width: 56px;
      border: 0;
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      cursor: pointer;
    }
    .recherche button:hover {
      background: var(--lce-gold-bright);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .actions a {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      min-width: 52px;
      max-width: 96px;
      color: var(--lce-on-navy);
      text-decoration: none;
      font: 600 11px/14px var(--lce-police-texte);
    }
    .actions a span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .actions a:hover,
    .actions a.actif {
      color: var(--lce-gold-bright);
    }
    .compteur {
      position: absolute;
      top: -6px;
      right: 6px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      font: 700 11px/18px var(--lce-police-texte);
      text-align: center;
    }
    .menu-mobile {
      display: none;
      place-items: center;
      width: var(--lce-cible-tactile);
      height: var(--lce-cible-tactile);
      margin-left: -10px;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
    }

    .categories {
      background: var(--lce-navy-700);
    }
    .categories-ligne {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 18px;
    }
    .categories a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 2px;
      border-bottom: 2px solid transparent;
      color: #e8ebf3;
      text-decoration: none;
      font: 600 13px/20px var(--lce-police-texte);
      white-space: nowrap;
    }
    // Sur ordinateur et tablette, la barre reste sur une ligne et défile si elle manque de place.
    @media (min-width: 768px) {
      .categories-ligne {
        flex-wrap: nowrap;
        overflow-x: auto;
        scrollbar-width: none;
      }
    }
    .categories a:hover,
    .categories a.on {
      color: var(--lce-gold-bright);
    }
    .categories a.on {
      border-bottom-color: var(--lce-gold-bright);
    }
    .categories .promotions {
      margin-left: auto;
    }
    .categories .promotions span {
      padding: 4px 8px;
      border-radius: var(--lce-rayon-badge);
      background: var(--lce-promo);
      color: var(--lce-on-navy);
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    @media (max-width: 1100px) {
      .marque-texte {
        display: none;
      }
    }
    @media (max-width: 767px) {
      .bandeau-liens {
        display: none;
      }
      .ligne {
        gap: 8px 12px;
        padding-block: 10px;
      }
      .menu-mobile {
        display: grid;
      }
      .marque img {
        width: 44px;
        height: 44px;
      }
      .actions {
        margin-left: auto;
        gap: 4px;
      }
      .actions a span {
        display: none;
      }
      .actions a {
        min-width: var(--lce-cible-tactile);
        min-height: var(--lce-cible-tactile);
        justify-content: center;
      }
      .compteur {
        top: 0;
        right: 0;
      }
      .recherche {
        order: 3;
        flex-basis: 100%;
      }
      .categories {
        display: none;
      }
      .categories.ouvert {
        display: block;
      }
      .categories-ligne {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding-block: 8px;
      }
      .categories a {
        padding: 12px 0;
        border-bottom: 1px solid rgb(255 255 255 / 8%);
      }
      .categories .promotions {
        margin-left: 0;
      }
    }
  `,
})
export class Entete {
  readonly categories = input<CategorieMenu[]>([]);
  readonly nbArticles = input(0);
  readonly nbFavoris = input(0);
  /** Prénom de la personne connectée, affiché à la place de « Compte ». */
  readonly prenom = input<string | null>(null);
  readonly bandeau = input('Livraison par nos propres livreurs à Bamako · Paiement à la livraison accepté');
  readonly rechercher = output<string>();

  protected readonly menuOuvert = signal(false);
  protected requete = '';
}
