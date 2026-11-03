import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Bouton } from '../bouton/bouton';
import { FcfaPipe } from '../format/fcfa';
import { Icone } from '../icone/icone';

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
  imageUrl: string;
  enRupture?: boolean;
}

/**
 * Carte produit du site : badge promo rouge OU « Nouveau », prix en promo si
 * réduit, bouton bleu nuit « Ajouter au panier ».
 */
@Component({
  selector: 'lce-carte-produit',
  imports: [RouterLink, Badge, Bouton, FcfaPipe, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte">
      <a class="visuel" [routerLink]="['/produit', produit().slug]">
        <img [src]="produit().imageUrl" [alt]="produit().nom" loading="lazy" width="400" height="400" />
        @if (remise()) {
          <lce-badge type="promo" class="badge">-{{ remise() }} %</lce-badge>
        } @else if (produit().nouveau) {
          <lce-badge type="nouveau" class="badge">Nouveau</lce-badge>
        }
      </a>
      <button
        type="button"
        class="favori"
        [class.actif]="favori()"
        [attr.aria-pressed]="favori()"
        [attr.aria-label]="favori() ? 'Retirer des favoris' : 'Ajouter aux favoris'"
        (click)="basculerFavori.emit(produit().id)"
      >
        <lce-icone nom="coeur" [taille]="20" />
      </button>

      <p class="categorie">{{ produit().categorie }}</p>
      <h3 class="nom">
        <a [routerLink]="['/produit', produit().slug]">{{ produit().nom }}</a>
      </h3>
      @if (produit().nbAvis > 0) {
        <p class="note">
          <lce-icone nom="etoile" [taille]="16" />
          {{ produit().noteMoyenne }}
          <span class="lce-visuellement-masque">sur 5,</span>
          ({{ produit().nbAvis }} avis)
        </p>
      }
      <p class="prix">
        <span [class.promo]="remise()">{{ produit().prix | fcfa }}</span>
        @if (remise()) {
          <s>{{ produit().prixBarre | fcfa }}</s>
        }
      </p>
      <button
        lceBouton
        variante="nuit"
        [pleineLargeur]="true"
        [disabled]="produit().enRupture"
        (click)="ajouterAuPanier.emit(produit().id)"
      >
        {{ produit().enRupture ? 'Rupture de stock' : 'Ajouter au panier' }}
      </button>
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
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--lce-espace-2);
      padding: var(--lce-espace-4);
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-surface);
      transition: box-shadow 150ms;
    }
    .carte:hover {
      box-shadow: var(--lce-ombre-card);
    }
    .visuel {
      position: relative;
      display: block;
      aspect-ratio: 1;
      border-radius: var(--lce-rayon-carte-mobile);
      background: var(--lce-surface-ivoire);
      overflow: hidden;
    }
    .visuel img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .badge {
      position: absolute;
      top: var(--lce-espace-3);
      left: var(--lce-espace-3);
    }
    .favori {
      position: absolute;
      top: var(--lce-espace-5);
      right: var(--lce-espace-5);
      display: grid;
      place-items: center;
      width: var(--lce-cible-tactile);
      height: var(--lce-cible-tactile);
      border: 0;
      border-radius: 50%;
      background: var(--lce-surface);
      color: var(--lce-navy);
      cursor: pointer;
    }
    .favori.actif {
      color: var(--lce-danger);
    }
    .favori.actif ::ng-deep svg {
      fill: currentColor;
    }
    .categorie {
      @include t.texte-surtitre;
      margin: 0;
      color: var(--lce-gold-text);
    }
    .nom {
      @include t.texte-h3;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .nom a {
      color: inherit;
      text-decoration: none;
    }
    .note {
      @include t.texte-small;
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0;
      color: var(--lce-ink-muted);
    }
    .note lce-icone {
      color: var(--lce-gold-deep);
    }
    .prix {
      @include t.texte-prix;
      display: flex;
      gap: var(--lce-espace-2);
      align-items: baseline;
      margin: 0 0 var(--lce-espace-2);
    }
    .prix .promo {
      color: var(--lce-promo);
    }
    // Bouton toujours en bas : les cartes d'une même ligne restent alignées.
    .carte > [lceBouton] {
      margin-top: auto;
    }
    .prix s {
      @include t.texte-small;
      color: var(--lce-ink-muted);
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
