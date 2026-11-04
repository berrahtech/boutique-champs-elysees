import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CarteProduit, ProduitCarte } from '@lce/ui';
import { Produit } from '../donnees/catalogue';
import { Favoris } from '../etat/favoris';
import { ActionsProduit } from './actions-produit';

export function versCarte(p: Produit): ProduitCarte {
  return {
    id: p.id,
    slug: p.slug,
    nom: p.nom,
    categorie: p.rayon,
    prix: p.prix,
    prixBarre: p.prixBarre,
    nouveau: !!p.nouveau,
    noteMoyenne: p.noteMoyenne,
    nbAvis: p.nbAvis,
    icone: p.icone,
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
      @for (carte of cartes(); track carte.id) {
        <li>
          <lce-carte-produit
            [produit]="carte"
            [favori]="favoris.ensemble().has(carte.id)"
            (ajouterAuPanier)="actions.ajouterAuPanier($event)"
            (basculerFavori)="actions.basculerFavori($event)"
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
  readonly produits = input.required<Produit[]>();
  readonly colonnes = input<'grille-4' | 'grille-3'>('grille-4');

  protected readonly favoris = inject(Favoris);
  protected readonly actions = inject(ActionsProduit);
  protected readonly cartes = computed(() => this.produits().map(versCarte));
}
