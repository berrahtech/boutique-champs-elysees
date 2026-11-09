import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';
import { NomIcone } from '../icone/icones';

export interface CategorieMenu {
  slug: string;
  nom: string;
  /** Libellé court de la rangée de pastilles. */
  court?: string;
  icone?: NomIcone;
}

/**
 * En-tête du site : bandeau noir, logo, pastille promotions, recherche, offres,
 * compte, favoris et panier, puis pastilles des catégories. Le bouton menu ouvre
 * le panneau complet ; sur téléphone, la recherche passe sur sa propre ligne.
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

    <div class="bandeau">
      <div class="lce-conteneur bandeau-ligne">
        <span>Bienvenue aux Champs Élysées</span>
        <nav aria-label="Services">
          <span class="zone"><lce-icone nom="localisation" [taille]="14" />Bamako, Mali</span>
          <a routerLink="/compte/commandes"><lce-icone nom="livraison" [taille]="14" />Suivre ma commande</a>
          <a routerLink="/aide"><lce-icone nom="aide" [taille]="14" />Aide</a>
        </nav>
      </div>
    </div>

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
          <lce-icone [nom]="menuOuvert() ? 'fermer' : 'menu'" [taille]="22" />
        </button>

        <a routerLink="/" class="marque" aria-label="Les Champs Élysées, accueil">
          <img src="/logo-lce.png" alt="" width="44" height="44" />
          <span>LES CHAMPS ÉLYSÉES</span>
        </a>

        <a routerLink="/promotions" class="vignette-promo"><span>PROMOS</span></a>

        <form class="recherche" role="search" (ngSubmit)="rechercher.emit(requete.trim())">
          <button type="submit" aria-label="Lancer la recherche"><lce-icone nom="recherche" [taille]="18" /></button>
          <label for="lce-recherche" class="lce-visuellement-masque">Rechercher un produit</label>
          <input id="lce-recherche" name="q" type="search" autocomplete="off" placeholder="Rechercher un produit, une marque…" [(ngModel)]="requete" />
        </form>

        <nav class="actions" aria-label="Mon espace">
          <a routerLink="/favoris" routerLinkActive="actif" class="offres">
            <lce-icone nom="favoris" [taille]="20" [plein]="nbFavoris() > 0" /><span>Favoris</span>
            @if (nbFavoris() > 0) {
              <b class="compteur" aria-hidden="true">{{ nbFavoris() }}</b>
            }
          </a>
          <a routerLink="/compte" routerLinkActive="actif">
            <lce-icone nom="compte" [taille]="20" /><span>{{ prenom() || 'Se connecter' }}</span>
          </a>
          <a routerLink="/panier" routerLinkActive="actif" [attr.aria-label]="'Panier, ' + nbArticles() + ' article' + (nbArticles() > 1 ? 's' : '')">
            <lce-icone nom="panier" [taille]="20" /><span>Panier</span>
            @if (nbArticles() > 0) {
              <b class="compteur" aria-hidden="true">{{ nbArticles() > 99 ? '99+' : nbArticles() }}</b>
            }
          </a>
        </nav>
      </div>

      <div class="pastilles">
        <nav class="lce-conteneur pastilles-ligne" aria-label="Rayons">
          @for (categorie of categories(); track categorie.slug) {
            <a [routerLink]="['/categorie', categorie.slug]" routerLinkActive="on">{{ categorie.court ?? categorie.nom }}</a>
          }
          <a routerLink="/promotions" routerLinkActive="on">Promotions</a>
        </nav>
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
      view-transition-name: entete;
    }
    .evitement {
      position: absolute;
      left: -9999px;
      z-index: 20;
      padding: 8px 16px;
      background: var(--lce-gold);
      color: var(--lce-on-gold);
    }
    .evitement:focus {
      left: 16px;
      top: 8px;
    }

    .bandeau {
      background: var(--lce-navy-700);
      color: var(--lce-on-navy);
      font-size: 13px;
      line-height: 18px;
    }
    .bandeau-ligne {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      min-height: 36px;
    }
    .bandeau nav {
      display: flex;
    }
    .bandeau nav > * {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding-inline: 16px;
      border-left: 1px solid rgb(255 255 255 / 30%);
    }
    .bandeau nav > :first-child {
      border-left: 0;
    }
    .bandeau nav > :last-child {
      padding-right: 0;
    }
    .bandeau a {
      color: inherit;
      text-decoration: none;
    }
    .bandeau a:hover {
      text-decoration: underline;
    }

    .barre {
      position: relative;
      z-index: 15;
      background: var(--lce-surface);
      color: var(--lce-ink);
    }
    .ligne {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-block: 12px;
    }
    .bouton-menu {
      flex: none;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: var(--lce-rayon-controle);
      background: var(--lce-info-soft);
      color: var(--lce-ink);
      cursor: pointer;
      transition: background-color 150ms;
    }
    .bouton-menu:hover {
      background: var(--lce-neutre-soft);
    }
    .marque {
      flex: none;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--lce-noir);
      text-decoration: none;
      font: 900 20px/24px var(--lce-police-titre);
      white-space: nowrap;
    }
    .marque img {
      display: block;
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .vignette-promo {
      flex: none;
      padding: 4px 10px;
      background: var(--lce-promo);
      color: var(--lce-gold-bright);
      font: italic 900 13px/18px var(--lce-police-titre);
      text-decoration: none;
      transform: skewX(-10deg);
      transition: transform 150ms;
    }
    .vignette-promo:hover {
      transform: skewX(-10deg) scale(1.06);
    }
    .vignette-promo span {
      display: block;
    }
    .recherche {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      height: 44px;
      padding-inline: 6px 16px;
      border-radius: var(--lce-rayon-controle);
      background: var(--lce-info-soft);
    }
    .recherche:focus-within {
      outline: 2px solid var(--lce-navy-500);
    }
    .recherche button {
      flex: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      background: none;
      color: var(--lce-ink);
      cursor: pointer;
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
    }
    .actions a {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      border-left: 1px solid var(--lce-line);
      color: var(--lce-ink-muted);
      font: 700 14px/20px var(--lce-police-texte);
      text-decoration: none;
      white-space: nowrap;
      transition: color 150ms;
    }
    .actions a:first-child {
      border-left: 0;
    }
    .actions a:last-child {
      padding-right: 0;
    }
    .actions a span {
      overflow: hidden;
      max-width: 110px;
      text-overflow: ellipsis;
    }
    .actions a:hover,
    .actions a.actif {
      color: var(--lce-noir);
    }
    .actions .offres {
      color: var(--lce-orange);
    }
    .compteur {
      position: absolute;
      top: -4px;
      left: 26px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-promo);
      color: var(--lce-on-navy);
      font: 700 10px/16px var(--lce-police-texte);
      text-align: center;
    }

    .pastilles {
      border-block: 1px solid var(--lce-line);
    }
    .pastilles-ligne {
      display: flex;
      gap: 12px;
      padding-block: 10px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .pastilles-ligne::-webkit-scrollbar {
      display: none;
    }
    .pastilles a {
      flex: none;
      padding: 7px 16px;
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-surface);
      color: var(--lce-ink);
      font: 500 13px/18px var(--lce-police-texte);
      text-decoration: none;
      transition:
        background-color 150ms,
        color 150ms,
        border-color 150ms;
    }
    .pastilles a:hover {
      border-color: var(--lce-noir);
    }
    .pastilles a.on {
      border-color: var(--lce-noir);
      background: var(--lce-noir);
      color: var(--lce-on-navy);
    }

    .ancre {
      position: relative;
    }
    .panneau {
      position: absolute;
      z-index: 15;
      top: 0;
      left: var(--lce-marge-ordinateur);
      width: 300px;
      padding: 8px;
      border-radius: 0 0 var(--lce-rayon-carte) var(--lce-rayon-carte);
      background: var(--lce-surface);
      box-shadow: 0 16px 40px rgb(0 0 0 / 18%);
      opacity: 0;
      transform: translateY(-6px);
      visibility: hidden;
      transition:
        opacity 150ms,
        transform 150ms,
        visibility 150ms;
    }
    .panneau.ouvert {
      opacity: 1;
      transform: none;
      visibility: visible;
    }
    .panneau a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--lce-rayon-controle);
      color: var(--lce-ink);
      font: 500 14px/20px var(--lce-police-texte);
      text-decoration: none;
    }
    .panneau a:hover {
      background: var(--lce-info-soft);
    }
    .panneau .promo,
    .panneau .promo lce-icone {
      color: var(--lce-promo);
    }

    @media (max-width: 1180px) {
      .vignette-promo {
        display: none;
      }
      .actions a span {
        display: none;
      }
      .compteur {
        left: 24px;
      }
    }
    @media (max-width: 767px) {
      .bandeau nav {
        display: none;
      }
      .bandeau-ligne {
        justify-content: center;
        min-height: 30px;
        font-size: 12px;
      }
      .ligne {
        flex-wrap: wrap;
        gap: 8px 10px;
        padding-block: 8px 10px;
      }
      .bouton-menu {
        width: 38px;
        height: 38px;
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
        width: 34px;
        height: 34px;
      }
      .actions a {
        padding: 4px 7px;
        border-left: 0;
      }
      .recherche {
        order: 3;
        flex-basis: 100%;
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
