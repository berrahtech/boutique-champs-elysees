import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { FcfaPipe } from '../format/fcfa';
import { Icone } from '../icone/icone';
import { NomIcone } from '../icone/icones';

export interface ProduitCarte {
  id: string;
  slug: string;
  nom: string;
  categorie: string;
  prix: number;
  prixBarre?: number | null;
  nouveau: boolean;
  noteMoyenne: number;
  nbAvis: number;
  /** Photo produit carrée. Sans photo, une icône discrète la remplace. */
  imageUrl?: string | null;
  icone?: NomIcone;
  stock?: number;
  enRupture?: boolean;
}

/** standard : photo, note et bouton noir avec le prix ; compacte : cellule de grille, prix en bleu. */
export type FormatCarte = 'standard' | 'compacte';

const SEUIL_STOCK_FAIBLE = 5;

/**
 * Carte produit : photo sur fond gris, badge jaune en coin, favori, alerte de
 * stock, nom, note, et bouton noir « Ajouter – prix ».
 */
@Component({
  selector: 'lce-carte-produit',
  imports: [RouterLink, Badge, FcfaPipe, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"format-" + format()' },
  template: `
    <article class="carte">
      <div class="cadre">
        <a class="visuel" [routerLink]="['/produit', produit().slug]" [attr.aria-label]="produit().nom" tabindex="-1">
          @if (produit().imageUrl) {
            <img [src]="produit().imageUrl" alt="" loading="lazy" decoding="async" width="400" height="400" />
          } @else {
            <lce-icone [nom]="produit().icone ?? 'sac'" [taille]="56" />
          }
        </a>
        @if (remise()) {
          <lce-badge type="promo" class="coin">−{{ remise() }} %</lce-badge>
        } @else if (produit().nouveau) {
          <lce-badge type="nouveau" class="coin">Nouveau</lce-badge>
        }
        <button
          type="button"
          class="favori"
          [class.actif]="favori()"
          [attr.aria-pressed]="favori()"
          [attr.aria-label]="(favori() ? 'Retirer ' : 'Ajouter ') + produit().nom + (favori() ? ' des favoris' : ' aux favoris')"
          (click)="basculerFavori.emit(produit().id)"
        >
          <lce-icone nom="favoris" [taille]="18" [plein]="favori()" />
        </button>
        @if (format() === 'compacte') {
          <button
            type="button"
            class="ajouter ajouter-rond"
            [disabled]="produit().enRupture"
            [attr.aria-label]="libelleAjout()"
            (click)="ajouterAuPanier.emit(produit().id)"
          >
            <lce-icone nom="panier" [taille]="18" />
          </button>
        }
      </div>

      <div class="corps">
        @if (stockFaible()) {
          <span class="alerte">Plus que {{ produit().stock }}</span>
        }
        <h3 class="nom">
          <a [routerLink]="['/produit', produit().slug]">{{ produit().nom }}</a>
        </h3>

        @if (format() === 'standard') {
          @if (produit().nbAvis > 0) {
            <span class="note">
              <span class="lce-visuellement-masque">Note {{ produit().noteMoyenne }} sur 5, {{ produit().nbAvis }} avis</span>
              <span aria-hidden="true" class="etoile"><lce-icone nom="etoile" [taille]="15" [plein]="true" /><b>{{ produit().noteMoyenne.toLocaleString('fr-FR') }}</b></span>
              <span aria-hidden="true">({{ produit().nbAvis }})</span>
            </span>
          }
          @if (remise()) {
            <s class="ancien"><span class="lce-visuellement-masque">au lieu de </span>{{ produit().prixBarre | fcfa }}</s>
          }
          <button
            type="button"
            class="ajouter acheter"
            [disabled]="produit().enRupture"
            [attr.aria-label]="libelleAjout()"
            (click)="ajouterAuPanier.emit(produit().id)"
          >
            @if (produit().enRupture) {
              Rupture
            } @else {
              Ajouter – <b>{{ produit().prix | fcfa }}</b>
            }
          </button>
        } @else {
          <p class="prix">
            <b>{{ produit().prix | fcfa }}</b>
            @if (remise()) {
              <s><span class="lce-visuellement-masque">au lieu de </span>{{ produit().prixBarre | fcfa }}</s>
            }
          </p>
        }
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .carte {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cadre {
      position: relative;
      overflow: hidden;
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-neutre-soft);
    }
    .visuel {
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      color: var(--lce-line-fort);
    }
    .visuel img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 280ms ease;
    }
    .carte:hover .visuel img {
      transform: scale(1.04);
    }
    .coin {
      position: absolute;
      top: 0;
      left: 0;
      border-radius: var(--lce-rayon-carte) 0 var(--lce-rayon-carte) 0;
    }
    .favori {
      position: absolute;
      top: 8px;
      right: 8px;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 50%;
      background: var(--lce-surface);
      color: var(--lce-ink);
      cursor: pointer;
      transition:
        transform 150ms,
        color 150ms;
    }
    .favori:hover {
      transform: scale(1.1);
    }
    .favori:active {
      transform: scale(0.92);
    }
    .favori.actif {
      color: var(--lce-promo);
    }
    .corps {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .alerte {
      color: var(--lce-promo);
      font: 700 11px/14px var(--lce-police-texte);
    }
    .nom {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      font: 700 15px/20px var(--lce-police-texte);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    .nom a {
      color: var(--lce-ink);
      text-decoration: none;
    }
    .nom a:hover {
      text-decoration: underline;
    }
    .note {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--lce-ink-muted);
      font-size: 12px;
      line-height: 16px;
    }
    .etoile {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--lce-ink);
    }
    .etoile lce-icone {
      color: var(--lce-gold);
    }
    .ancien {
      color: var(--lce-ink-muted);
      font-size: 12px;
      line-height: 16px;
    }
    .ajouter {
      border: 0;
      cursor: pointer;
    }
    .ajouter:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .acheter {
      min-height: 38px;
      margin-top: auto;
      padding: 6px 8px;
      border-radius: var(--lce-rayon-badge);
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      font: 700 12px/16px var(--lce-police-texte);
      text-transform: uppercase;
      transition:
        background-color 150ms,
        transform 100ms;
    }
    .acheter b {
      color: var(--lce-gold-bright);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .acheter:hover:not(:disabled) {
      background: var(--lce-noir);
    }
    .acheter:active:not(:disabled) {
      transform: scale(0.98);
    }

    .ajouter-rond {
      position: absolute;
      right: 8px;
      bottom: 8px;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      transition: transform 150ms;
    }
    .ajouter-rond:hover:not(:disabled) {
      transform: scale(1.1);
    }
    .ajouter-rond:active:not(:disabled) {
      transform: scale(0.92);
    }
    :host(.format-compacte) .nom {
      font: 400 13px/18px var(--lce-police-texte);
    }
    .prix {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 2px 6px;
      margin: auto 0 0;
    }
    .prix b {
      color: var(--lce-navy-500);
      font: 700 14px/20px var(--lce-police-texte);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .prix s {
      color: var(--lce-ink-muted);
      font-size: 12px;
      white-space: nowrap;
    }
  `,
})
export class CarteProduit {
  readonly produit = input.required<ProduitCarte>();
  readonly favori = input(false);
  readonly format = input<FormatCarte>('standard');
  readonly ajouterAuPanier = output<string>();
  readonly basculerFavori = output<string>();

  /** Pourcentage de réduction arrondi, ou 0 sans prix barré. */
  protected readonly remise = computed(() => {
    const { prix, prixBarre } = this.produit();
    return prixBarre && prixBarre > prix ? Math.round((1 - prix / prixBarre) * 100) : 0;
  });

  protected readonly stockFaible = computed(() => {
    const { enRupture, stock } = this.produit();
    return !enRupture && stock !== undefined && stock <= SEUIL_STOCK_FAIBLE;
  });

  protected readonly libelleAjout = computed(() => {
    const { enRupture, nom } = this.produit();
    return enRupture ? `${nom} : rupture de stock` : `Ajouter ${nom} au panier`;
  });
}
