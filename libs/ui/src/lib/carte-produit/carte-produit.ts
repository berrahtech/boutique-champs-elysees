import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Bouton } from '../bouton/bouton';
import { Etoiles } from '../etoiles/etoiles';
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
  /** Photo produit (carrée, fond blanc ou ivoire). Sans photo, l'icône dorée la remplace. */
  imageUrl?: string | null;
  icone?: NomIcone;
  enRupture?: boolean;
}

/**
 * Carte produit du site (maquette « Carte ») : badge promo rouge OU « Nouveau »,
 * favori, catégorie, nom, note, prix (en rouge si réduit, ancien prix barré),
 * bouton bleu nuit « Ajouter au panier » toujours en bas de carte.
 */
@Component({
  selector: 'lce-carte-produit',
  imports: [RouterLink, Badge, Bouton, Etoiles, FcfaPipe, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte">
      <div class="visuel">
        <a [routerLink]="['/produit', produit().slug]" [attr.aria-label]="produit().nom" tabindex="-1">
          @if (produit().imageUrl) {
            <img [src]="produit().imageUrl" alt="" loading="lazy" width="400" height="400" />
          } @else {
            <lce-icone [nom]="produit().icone ?? 'sac'" [taille]="72" />
          }
        </a>
        <div class="badges">
          @if (remise()) {
            <lce-badge type="promo">−{{ remise() }} %</lce-badge>
          } @else if (produit().nouveau) {
            <lce-badge type="nouveau">Nouveau</lce-badge>
          }
        </div>
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
      </div>

      <div class="corps">
        <span class="categorie">{{ produit().categorie }}</span>
        <h3 class="nom">
          <a [routerLink]="['/produit', produit().slug]">{{ produit().nom }}</a>
        </h3>
        @if (produit().nbAvis > 0) {
          <span class="note">
            <lce-etoiles [note]="produit().noteMoyenne" />
            <span>({{ produit().nbAvis }} avis)</span>
          </span>
        }
        <p class="prix">
          <b [class.promo]="remise()">{{ produit().prix | fcfa }}</b>
          @if (remise()) {
            <s><span class="lce-visuellement-masque">au lieu de </span>{{ produit().prixBarre | fcfa }}</s>
          }
        </p>
        <button
          lceBouton
          variante="nuit"
          [petit]="true"
          [pleineLargeur]="true"
          [disabled]="produit().enRupture"
          (click)="ajouterAuPanier.emit(produit().id)"
        >
          @if (produit().enRupture) {
            Rupture de stock
          } @else {
            <lce-icone nom="panier-ajouter" [taille]="18" />
            Ajouter au panier
          }
        </button>
      </div>
    </article>
  `,
  styles: `
    @use 'typographie' as t;

    :host {
      display: block;
      height: 100%;
    }
    .carte {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--lce-surface);
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-carte);
      overflow: hidden;
      transition: box-shadow 200ms;
    }
    .carte:hover {
      box-shadow: var(--lce-ombre-card);
    }
    .visuel {
      position: relative;
    }
    .visuel > a {
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      background: var(--lce-surface-ivoire);
      color: var(--lce-gold-deep);
    }
    .visuel img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .badges {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      gap: 6px;
    }
    .favori {
      position: absolute;
      z-index: 1;
      top: 8px;
      right: 8px;
      display: grid;
      place-items: center;
      width: var(--lce-cible-tactile);
      height: var(--lce-cible-tactile);
      border: 0;
      border-radius: 50%;
      background: var(--lce-surface);
      color: var(--lce-ink);
      cursor: pointer;
    }
    .favori:hover,
    .favori.actif {
      color: var(--lce-danger);
    }
    .corps {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: var(--lce-espace-4);
    }
    .categorie {
      @include t.texte-surtitre;
      font-size: 11px;
      letter-spacing: 0.12em;
      color: var(--lce-ink-muted);
    }
    .nom {
      margin: 0;
      font: 600 17px/24px var(--lce-police-titre);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .nom a {
      color: var(--lce-ink);
      text-decoration: none;
    }
    .nom a:hover {
      color: var(--lce-gold-text);
    }
    .note {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--lce-ink-muted);
    }
    .prix {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px;
      margin: 4px 0 12px;
    }
    .prix b {
      @include t.texte-prix;
    }
    .prix .promo {
      color: var(--lce-promo);
    }
    .prix s {
      font-size: 13px;
      color: var(--lce-ink-muted);
    }
    .corps > [lceBouton] {
      margin-top: auto;
    }
    // Deux cartes par ligne sur téléphone : on gagne la place de l'icône du bouton.
    @media (max-width: 520px) {
      .corps {
        padding: var(--lce-espace-3);
      }
      .corps > [lceBouton] {
        padding-inline: 8px;
        font-size: 12px;
      }
      .corps > [lceBouton] lce-icone {
        display: none;
      }
    }
  `,
})
export class CarteProduit {
  readonly produit = input.required<ProduitCarte>();
  readonly favori = input(false);
  readonly ajouterAuPanier = output<string>();
  readonly basculerFavori = output<string>();

  /** Pourcentage de réduction arrondi, ou 0 sans prix barré. */
  protected readonly remise = computed(() => {
    const { prix, prixBarre } = this.produit();
    return prixBarre && prixBarre > prix ? Math.round((1 - prix / prixBarre) * 100) : 0;
  });
}
