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

const SEUIL_STOCK_FAIBLE = 5;

/**
 * Carte produit : photo, favori, nom sur deux lignes, note et nombre d'avis,
 * étiquette seulement si elle apporte quelque chose (nouveauté, stock faible,
 * rupture), prix, ancien prix barré, pastille de réduction et bouton panier.
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
              <span aria-hidden="true" class="attenue">({{ produit().nbAvis }})</span>
            </span>
          }
        }
        @if (format() === 'standard') {
          @switch (etiquette()) {
            @case ('rupture') {
              <span class="etiquette rupture">Rupture</span>
            }
            @case ('nouveaute') {
              <lce-badge type="nouveau" class="etiquette">Nouveauté</lce-badge>
            }
            @case ('stock') {
              <span class="etiquette info">Plus que {{ produit().stock }}</span>
            }
          }
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
      overflow: hidden;
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-surface);
      transition: box-shadow 180ms;
    }
    .carte:hover {
      box-shadow: var(--lce-ombre-card);
    }
    .visuel {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      overflow: hidden;
      background: var(--lce-surface-douce);
      color: var(--lce-line-fort);
    }
    .visuel img {
      width: 100%;
      height: 100%;
      object-fit: cover;
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
      gap: 6px;
      min-width: 0;
      padding: 12px;
    }
    .nom {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      font: 400 14px/19px var(--lce-police-texte);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      min-height: 38px;
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
      gap: 4px;
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
    .etiquette {
      align-self: flex-start;
      padding: 2px 8px;
      border-radius: var(--lce-rayon-badge);
      font: 500 12px/18px var(--lce-police-texte);
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
      width: 40px;
      height: 36px;
      border: 0;
      border-radius: var(--lce-rayon-controle);
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
      border-radius: var(--lce-rayon-controle);
    }

    :host(.format-horizontale) .carte {
      flex-direction: row;
    }
    :host(.format-horizontale) .visuel {
      flex: 0 0 40%;
    }
    :host(.format-horizontale) .nom {
      font-size: 15px;
      line-height: 20px;
      -webkit-line-clamp: 2;
      min-height: 0;
    }
    :host(.format-horizontale) .favori {
      top: auto;
      right: 60px;
      bottom: 14px;
    }

    @media (max-width: 520px) {
      .prix b {
        font-size: 15px;
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

  /** Pourcentage de réduction arrondi, ou 0 sans prix barré. */
  protected readonly remise = computed(() => {
    const { prix, prixBarre } = this.produit();
    return prixBarre && prixBarre > prix ? Math.round((1 - prix / prixBarre) * 100) : 0;
  });

  protected readonly etiquette = computed(() => {
    const { enRupture, nouveau, stock } = this.produit();
    if (enRupture) return 'rupture';
    if (nouveau) return 'nouveaute';
    if (stock !== undefined && stock <= SEUIL_STOCK_FAIBLE) return 'stock';
    return null;
  });
}
