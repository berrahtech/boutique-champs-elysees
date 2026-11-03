import { Component, signal } from '@angular/core';
import {
  Badge,
  Bascule,
  Bouton,
  CarteProduit,
  MenuClient,
  PastilleStatut,
  ProduitCarte,
  Quantite,
  STATUTS_COMMANDE,
  STATUTS_PAIEMENT,
} from '@lce/ui';

/**
 * Page de démonstration des composants partagés (lot 0). Elle tient lieu
 * d'accueil jusqu'au lot 1, puis sera retirée.
 */
@Component({
  selector: 'lce-vitrine',
  imports: [Badge, Bascule, Bouton, CarteProduit, MenuClient, PastilleStatut, Quantite],
  template: `
    <div class="lce-conteneur page">
      <h1>Composants partagés</h1>

      <section>
        <h2>Boutons</h2>
        <div class="ligne">
          <button lceBouton variante="or">Commander</button>
          <button lceBouton variante="nuit">Ajouter au panier</button>
          <button lceBouton variante="contour">Voir le détail</button>
          <button lceBouton variante="clair" [petit]="true">Annuler</button>
        </div>
      </section>

      <section>
        <h2>Badges, pastilles, bascule, quantité</h2>
        <div class="ligne">
          <lce-badge type="promo">-20 %</lce-badge>
          <lce-badge type="nouveau">Nouveau</lce-badge>
          <lce-badge type="premium">Premium</lce-badge>
        </div>
        <div class="ligne">
          @for (statut of statutsCommande; track statut.libelle) {
            <lce-pastille-statut [statut]="statut" />
          }
        </div>
        <div class="ligne">
          @for (statut of statutsPaiement; track statut.libelle) {
            <lce-pastille-statut [statut]="statut" />
          }
        </div>
        <div class="ligne">
          <lce-bascule [(active)]="disponible" libelle="Disponible" />
          <lce-quantite [(valeur)]="quantite" [max]="5" />
          <span>Quantité : {{ quantite() }}</span>
        </div>
      </section>

      <section>
        <h2>Cartes produit</h2>
        <div class="grille">
          @for (produit of produits; track produit.id) {
            <lce-carte-produit
              [produit]="produit"
              [favori]="favoris().has(produit.id)"
              (basculerFavori)="basculerFavori($event)"
            />
          }
        </div>
      </section>

      <section>
        <h2>Menu de l'espace client</h2>
        <lce-menu-client class="menu" />
      </section>
    </div>
  `,
  styles: `
    .page {
      display: grid;
      gap: var(--lce-espace-7);
      padding-block: var(--lce-espace-7);
    }
    section {
      display: grid;
      gap: var(--lce-espace-4);
    }
    .ligne {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--lce-espace-3);
    }
    .grille {
      display: grid;
      gap: var(--lce-espace-5);
      grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 860px) {
      .grille {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (min-width: 1100px) {
      .grille {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .menu {
      max-width: 320px;
    }
  `,
})
export class Vitrine {
  protected readonly statutsCommande = Object.values(STATUTS_COMMANDE);
  protected readonly statutsPaiement = Object.values(STATUTS_PAIEMENT);
  protected readonly disponible = signal(true);
  protected readonly quantite = signal(1);
  protected readonly favoris = signal(new Set<string>(['2']));

  protected readonly produits: ProduitCarte[] = [
    { id: '1', slug: 'eau-de-parfum-oud', nom: 'Eau de parfum Oud royal', categorie: 'Parfums', prix: 38400, prixBarre: 48000, nouveau: false, noteMoyenne: 4.6, nbAvis: 32, imageUrl: 'produit-exemple.svg' },
    { id: '2', slug: 'creme-karite', nom: 'Crème au karité pur', categorie: 'Beauté', prix: 7500, nouveau: true, noteMoyenne: 0, nbAvis: 0, imageUrl: 'produit-exemple.svg' },
    { id: '3', slug: 'boubou-bazin', nom: 'Boubou en bazin riche brodé main, finition or', categorie: 'Mode', prix: 153600, nouveau: false, noteMoyenne: 4.9, nbAvis: 8, imageUrl: 'produit-exemple.svg' },
    { id: '4', slug: 'diffuseur-encens', nom: "Diffuseur d'encens", categorie: 'Maison', prix: 12000, nouveau: false, noteMoyenne: 4.1, nbAvis: 5, imageUrl: 'produit-exemple.svg', enRupture: true },
  ];

  protected basculerFavori(id: string): void {
    this.favoris.update((actuels) => {
      const suivants = new Set(actuels);
      if (suivants.has(id)) suivants.delete(id);
      else suivants.add(id);
      return suivants;
    });
  }
}
