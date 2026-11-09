import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import type { ProduitPublic } from '@lce/contrats';
import { CarteProduit, FormatCarte, NomIcone, ProduitCarte } from '@lce/ui';
import { CacheProduits } from '../donnees/cache-produits';
import { Favoris } from '../etat/favoris';
import { ActionsProduit } from './actions-produit';

export function versCarte(p: ProduitPublic): ProduitCarte {
  return {
    id: p.id,
    slug: p.slug,
    nom: p.nom,
    categorie: p.rayon || p.categorie.nom,
    prix: p.prix,
    prixBarre: p.prixBarre,
    nouveau: p.nouveau,
    noteMoyenne: p.noteMoyenne,
    nbAvis: p.nbAvis,
    imageUrl: p.images[0]?.url400 ?? null,
    icone: (p.icone ?? 'sac') as NomIcone,
    stock: p.stock,
    enRupture: p.stock === 0,
  };
}

/** Grille de cartes produit, branchée au panier et aux favoris. */
@Component({
  selector: 'lce-cartes',
  imports: [CarteProduit],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul [class]="colonnes()">
      @for (p of produits(); track p.id; let i = $index) {
        <li>
          <lce-carte-produit
            [produit]="cartes()[i]"
            [format]="format()"
            [favori]="favoris.ensemble().has(p.id)"
            (ajouterAuPanier)="actions.ajouterAuPanier(p)"
            (basculerFavori)="actions.basculerFavori(p)"
          />
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ligne-5,
    .ligne-6 {
      display: flex;
      gap: 14px;
    }
    .ligne-5 > li,
    .ligne-6 > li {
      flex: none;
      scroll-snap-align: start;
    }
    .ligne-5 > li {
      width: calc((100% - 4 * 14px) / 5);
    }
    .ligne-6 > li {
      width: calc((100% - 5 * 14px) / 6);
    }
    @media (max-width: 1100px) {
      .ligne-5 > li,
      .ligne-6 > li {
        width: 200px;
      }
    }
    @media (max-width: 767px) {
      .ligne-5,
      .ligne-6 {
        gap: 12px;
      }
      .ligne-5 > li {
        width: 172px;
      }
      .ligne-6 > li {
        width: 148px;
      }
    }
  `,
})
export class Cartes {
  readonly produits = input.required<ProduitPublic[]>();
  readonly colonnes = input<'grille-4' | 'grille-3' | 'ligne-5' | 'ligne-6'>('grille-4');

  readonly format = input<FormatCarte>('standard');

  protected readonly favoris = inject(Favoris);
  protected readonly actions = inject(ActionsProduit);
  protected readonly cartes = computed(() => this.produits().map(versCarte));

  constructor() {
    const cache = inject(CacheProduits);
    effect(() => cache.retenir(this.produits()));
  }
}
