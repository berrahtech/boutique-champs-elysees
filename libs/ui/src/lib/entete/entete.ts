import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';

export interface CategorieMenu {
  slug: string;
  nom: string;
}

/**
 * En-tête du site : bandeau or, logo sur fond sombre, recherche,
 * Compte / Favoris / Panier (pastille du nombre d'articles), puis la barre
 * des catégories + Promotions. Se replie derrière un bouton menu sur mobile.
 */
@Component({
  selector: 'lce-entete',
  imports: [RouterLink, RouterLinkActive, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (bandeau()) {
      <p class="bandeau">{{ bandeau() }}</p>
    }
    <header class="barre">
      <div class="lce-conteneur ligne">
        <button
          type="button"
          class="icone-bouton menu-mobile"
          [attr.aria-expanded]="menuOuvert()"
          aria-controls="lce-categories"
          [attr.aria-label]="menuOuvert() ? 'Fermer le menu' : 'Ouvrir le menu'"
          (click)="menuOuvert.set(!menuOuvert())"
        >
          <lce-icone [nom]="menuOuvert() ? 'fermer' : 'menu'" />
        </button>

        <a routerLink="/" class="logo">
          <img [src]="logoUrl()" alt="Les Champs Élysées, accueil" height="44" />
        </a>

        <form class="recherche" role="search" (submit)="$event.preventDefault(); rechercher.emit(champ.value.trim())">
          <label for="lce-recherche" class="lce-visuellement-masque">Rechercher un produit</label>
          <input id="lce-recherche" #champ type="search" placeholder="Rechercher un produit, une marque…" />
          <button type="submit" class="icone-bouton" aria-label="Lancer la recherche">
            <lce-icone nom="recherche" />
          </button>
        </form>

        <nav class="actions" aria-label="Mon espace">
          <a routerLink="/compte" class="icone-bouton" aria-label="Mon compte"><lce-icone nom="compte" /></a>
          <a routerLink="/compte/favoris" class="icone-bouton" aria-label="Mes favoris"><lce-icone nom="coeur" /></a>
          <a routerLink="/panier" class="icone-bouton panier" [attr.aria-label]="'Panier, ' + nbArticles() + ' article(s)'">
            <lce-icone nom="panier" />
            @if (nbArticles() > 0) {
              <span class="compteur" aria-hidden="true">{{ nbArticles() > 99 ? '99+' : nbArticles() }}</span>
            }
          </a>
        </nav>
      </div>

      <nav id="lce-categories" class="categories" [class.ouvert]="menuOuvert()" aria-label="Catégories">
        <ul class="lce-conteneur">
          @for (categorie of categories(); track categorie.slug) {
            <li>
              <a [routerLink]="['/categorie', categorie.slug]" routerLinkActive="actif" (click)="menuOuvert.set(false)">
                {{ categorie.nom }}
              </a>
            </li>
          }
          <li>
            <a routerLink="/promotions" routerLinkActive="actif" class="promotions" (click)="menuOuvert.set(false)">Promotions</a>
          </li>
        </ul>
      </nav>
    </header>
  `,
  styles: `
    @use 'typographie' as t;

    .bandeau {
      @include t.texte-small;
      margin: 0;
      padding: 6px var(--lce-espace-4);
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      text-align: center;
      font-weight: 600;
    }
    .barre {
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .ligne {
      display: flex;
      align-items: center;
      gap: var(--lce-espace-5);
      min-height: 76px;
    }
    .logo {
      flex: none;
    }
    .recherche {
      flex: 1;
      display: flex;
      max-width: 560px;
      background: var(--lce-surface);
      border-radius: var(--lce-rayon-controle);
    }
    .recherche input {
      @include t.texte-body;
      flex: 1;
      min-width: 0;
      border: 0;
      padding-inline: var(--lce-espace-4);
      background: transparent;
      color: var(--lce-ink);
    }
    .recherche .icone-bouton {
      color: var(--lce-navy);
    }
    .actions {
      display: flex;
      gap: var(--lce-espace-1);
      margin-left: auto;
    }
    .icone-bouton {
      position: relative;
      display: grid;
      place-items: center;
      width: var(--lce-cible-tactile);
      height: var(--lce-cible-tactile);
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
    }
    .compteur {
      position: absolute;
      top: 2px;
      right: 0;
      min-width: 18px;
      padding: 0 4px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      font-size: 11px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
    }
    .menu-mobile {
      display: none;
    }
    .categories {
      background: var(--lce-navy-700);
    }
    .categories ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--lce-espace-5);
      margin: 0 auto;
      list-style: none;
    }
    .categories a {
      @include t.texte-label;
      display: block;
      padding-block: var(--lce-espace-3);
      color: var(--lce-on-navy);
      text-decoration: none;
      border-bottom: 2px solid transparent;
    }
    .categories a:hover,
    .categories a.actif {
      border-bottom-color: var(--lce-gold-bright);
    }
    .categories .promotions {
      color: var(--lce-gold-bright);
    }

    @media (max-width: 767px) {
      .ligne {
        flex-wrap: wrap;
        gap: var(--lce-espace-2);
        padding-block: var(--lce-espace-2);
      }
      .menu-mobile {
        display: grid;
      }
      .recherche {
        order: 3;
        flex-basis: 100%;
        max-width: none;
        margin-bottom: var(--lce-espace-2);
      }
      .categories {
        display: none;
      }
      .categories.ouvert {
        display: block;
      }
      .categories ul {
        flex-direction: column;
        gap: 0;
      }
    }
  `,
})
export class Entete {
  readonly categories = input<CategorieMenu[]>([]);
  readonly nbArticles = input(0);
  readonly bandeau = input<string>();
  readonly logoUrl = input('/logo-lce-fond-sombre.svg');
  readonly rechercher = output<string>();

  protected readonly menuOuvert = signal(false);
}
