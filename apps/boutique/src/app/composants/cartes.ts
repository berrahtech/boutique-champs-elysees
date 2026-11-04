import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ProduitPublic } from '@lce/contrats';
import { CarteProduit, NomIcone, ProduitCarte } from '@lce/ui';
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
  `,
})
export class Cartes {
  readonly produits = input.required<ProduitPublic[]>();
  readonly colonnes = input<'grille-4' | 'grille-3'>('grille-4');

  protected readonly favoris = inject(Favoris);
  protected readonly actions = inject(ActionsProduit);
  protected readonly cartes = computed(() => this.produits().map(versCarte));
}
