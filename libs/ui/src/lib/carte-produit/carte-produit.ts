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

/** standard : carte verticale complète ; compacte : sans note ni étiquette ; horizontale : photo à gauche. */
export type FormatCarte = 'standard' | 'compacte' | 'horizontale';

/** Le sceau « Choix des clients » récompense des avis réels, pas une décision marketing. */
const NOTE_CHOIX = 4.5;
const AVIS_CHOIX = 20;
const SEUIL_STOCK_FAIBLE = 5;

/** Contour festonné du sceau, tracé une fois pour toutes. */
const SCEAU = Array.from({ length: 28 }, (_, i) => {
  const rayon = i % 2 ? 46 : 50;
  const angle = (i / 28) * 2 * Math.PI;
  return `${(50 + rayon * Math.cos(angle)).toFixed(1)},${(50 + rayon * Math.sin(angle)).toFixed(1)}`;
}).join(' ');

/**
 * Carte produit : photo sur fond blanc, favori, sceau, nom sur deux lignes,
 * note et nombre d'avis, étiquette (nouveauté, stock, livraison), prix, ancien
 * prix barré, pastille de réduction et bouton panier.
 */
@Component({
  selector: 'lce-carte-produit',
  imports: [RouterLink, Badge, FcfaPipe, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"format-" + format()' },
  template: `
    <article class="carte">
      <a class="visuel" [routerLink]="['/produit', produit().slug]" [attr.aria-label]="produit().nom" tabindex="-1">
        @if (produit().imageUrl) {
          <img [src]="produit().imageUrl" alt="" loading="lazy" width="400" height="400" />
        } @else {
          <lce-icone [nom]="produit().icone ?? 'sac'" [taille]="56" />
        }
        @if (choixClients()) {
          <span class="sceau">
            <svg viewBox="0 0 100 100" aria-hidden="true"><polygon [attr.points]="sceau" /></svg>
            <span>choix des clients</span>
          </span>
        }
      </a>
      <button
        type="button"
        class="favori"
        [class.actif]="favori()"
        [attr.aria-pressed]="favori()"
        [attr.aria-label]="(favori() ? 'Retirer ' : 'Ajouter ') + produit().nom + (favori() ? ' des favoris' : ' aux favoris')"
        (click)="basculerFavori.emit(produit().id)"
      >
        <lce-icone nom="favoris" [taille]="20" [plein]="favori()" />
      </button>

      <div class="corps">
        <h3 class="nom">
          <a [routerLink]="['/produit', produit().slug]">{{ produit().nom }}</a>
        </h3>

        @if (format() !== 'compacte') {
          @if (produit().nbAvis > 0) {
            <span class="note">
              <span class="lce-visuellement-masque">Note {{ produit().noteMoyenne }} sur 5, {{ produit().nbAvis }} avis</span>
              <span aria-hidden="true" class="note-valeur etoile"><lce-icone nom="etoile" [taille]="16" [plein]="true" />{{ produit().noteMoyenne.toLocaleString('fr-FR') }}</span>
              <span aria-hidden="true" class="note-valeur"><lce-icone nom="message" [taille]="16" />{{ produit().nbAvis }}</span>
            </span>
          }
        }
        @if (format() === 'standard') {
          <div class="etiquette-zone">
            @switch (etiquette()) {
              @case ('rupture') {
                <span class="etiquette rupture">Rupture de stock</span>
              }
              @case ('nouveaute') {
                <lce-badge type="nouveau" class="grand">Nouveauté</lce-badge>
              }
              @case ('stock') {
                <span class="etiquette info">Plus que {{ produit().stock }} en stock</span>
              }
              @case ('livraison') {
                <span class="etiquette livraison"><lce-icone nom="livraison" [taille]="16" />Livré en 24–48 h</span>
              }
            }
          </div>
        }

        <div class="achat">
          <div class="prix">
            <b>{{ produit().prix | fcfa }}</b>
            @if (remise()) {
              <span class="ancien">
                <s><span class="lce-visuellement-masque">au lieu de </span>{{ produit().prixBarre | fcfa }}</s>
                <lce-badge type="promo">−{{ remise() }} %</lce-badge>
              </span>
            }
          </div>
          <button
            type="button"
            class="ajouter"
            [disabled]="produit().enRupture"
            [attr.aria-label]="produit().enRupture ? produit().nom + ' : rupture de stock' : 'Ajouter ' + produit().nom + ' au panier'"
            (click)="ajouterAuPanier.emit(produit().id)"
          >
            <lce-icone nom="panier" [taille]="20" />
          </button>
        </div>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .carte {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .visuel {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-surface);
      box-shadow: 0 1px 3px rgb(22 24 70 / 6%);
      color: var(--lce-line-fort);
      transition: box-shadow 180ms;
    }
    .carte:hover .visuel {
      box-shadow: var(--lce-ombre-card);
    }
    .visuel img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .sceau {
      position: absolute;
      top: 10px;
      left: 10px;
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      color: var(--lce-on-gold);
      font: 600 8px/9px var(--lce-police-texte);
      text-align: center;
    }
    .sceau svg {
      position: absolute;
      inset: 0;
      fill: var(--lce-gold-bright);
    }
    .sceau span {
      position: relative;
      padding-inline: 4px;
    }
    .favori {
      position: absolute;
      top: 6px;
      right: 6px;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--lce-ink-muted);
      cursor: pointer;
    }
    .favori:hover,
    .favori.actif {
      color: var(--lce-promo);
    }
    .corps {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    .nom {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      font: 500 15px/20px var(--lce-police-texte);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      min-height: 40px;
    }
    .nom a {
      color: var(--lce-ink);
      text-decoration: none;
    }
    .nom a:hover {
      color: var(--lce-navy);
      text-decoration: underline;
    }
    .note {
      display: flex;
      gap: 14px;
      color: var(--lce-ink-muted);
      font-size: 13px;
      line-height: 18px;
    }
    .note-valeur {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .etoile lce-icone {
      color: var(--lce-etoile);
    }
    .etiquette-zone {
      min-height: 26px;
    }
    .etiquette,
    .grand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: var(--lce-rayon-badge);
      font: 500 12px/18px var(--lce-police-texte);
    }
    .livraison {
      background: var(--lce-success-soft);
      color: var(--lce-success);
    }
    .info {
      background: var(--lce-info-soft);
      color: var(--lce-navy-500);
    }
    .rupture {
      background: var(--lce-neutre-soft);
      color: var(--lce-ink-muted);
    }
    .achat {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-top: auto;
    }
    .prix {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .prix b {
      font: 600 17px/24px var(--lce-police-texte);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .ancien {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px 6px;
      font-size: 12px;
      line-height: 18px;
    }
    .ancien s {
      color: var(--lce-promo);
      white-space: nowrap;
    }
    .ancien lce-badge {
      padding: 0 6px;
      font-size: 11px;
    }
    .ajouter {
      flex: none;
      display: grid;
      place-items: center;
      width: 46px;
      height: 42px;
      border: 0;
      border-radius: 14px;
      background: var(--lce-primaire-soft);
      color: var(--lce-navy);
      cursor: pointer;
      transition:
        background-color 150ms,
        color 150ms;
    }
    .ajouter:hover:not(:disabled) {
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .ajouter:disabled {
      background: var(--lce-neutre-soft);
      color: var(--lce-ink-muted);
      cursor: not-allowed;
    }

    :host(.format-compacte) .carte {
      gap: 10px;
    }
    :host(.format-compacte) .nom {
      font-size: 13px;
      line-height: 18px;
      min-height: 36px;
    }
    :host(.format-compacte) .prix b {
      font-size: 15px;
      line-height: 22px;
    }
    :host(.format-compacte) .ajouter {
      width: 40px;
      height: 34px;
      border-radius: 12px;
    }
    :host(.format-compacte) .sceau {
      display: none;
    }

    :host(.format-horizontale) .carte {
      flex-direction: row;
      gap: 20px;
      padding: 16px;
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-surface);
      box-shadow: 0 1px 3px rgb(22 24 70 / 6%);
      transition: box-shadow 180ms;
    }
    :host(.format-horizontale) .carte:hover {
      box-shadow: var(--lce-ombre-card);
    }
    :host(.format-horizontale) .visuel {
      flex: 0 0 44%;
      box-shadow: none;
      align-self: center;
    }
    :host(.format-horizontale) .nom {
      font-size: 16px;
      line-height: 22px;
      -webkit-line-clamp: 3;
      min-height: 0;
    }
    :host(.format-horizontale) .favori {
      top: auto;
      right: 66px;
      bottom: 19px;
    }

    @media (max-width: 520px) {
      .prix b {
        font-size: 15px;
      }
      .ajouter {
        width: 40px;
        height: 36px;
        border-radius: 12px;
      }
      :host(.format-horizontale) .carte {
        gap: 12px;
        padding: 12px;
      }
      :host(.format-horizontale) .favori {
        top: 6px;
        right: 6px;
        bottom: auto;
      }
      :host(.format-horizontale) .nom {
        padding-right: 28px;
      }
    }
  `,
})
export class CarteProduit {
  readonly produit = input.required<ProduitCarte>();
  readonly favori = input(false);
  readonly format = input<FormatCarte>('standard');
  readonly ajouterAuPanier = output<string>();
  readonly basculerFavori = output<string>();

  protected readonly sceau = SCEAU;

  /** Pourcentage de réduction arrondi, ou 0 sans prix barré. */
  protected readonly remise = computed(() => {
    const { prix, prixBarre } = this.produit();
    return prixBarre && prixBarre > prix ? Math.round((1 - prix / prixBarre) * 100) : 0;
  });

  protected readonly choixClients = computed(() => {
    const { noteMoyenne, nbAvis } = this.produit();
    return noteMoyenne >= NOTE_CHOIX && nbAvis >= AVIS_CHOIX;
  });

  protected readonly etiquette = computed(() => {
    const { enRupture, nouveau, stock } = this.produit();
    if (enRupture) return 'rupture';
    if (nouveau) return 'nouveaute';
    if (stock !== undefined && stock <= SEUIL_STOCK_FAIBLE) return 'stock';
    return 'livraison';
  });
}
