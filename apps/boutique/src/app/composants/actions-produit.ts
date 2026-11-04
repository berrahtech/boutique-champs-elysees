import { inject, Injectable } from '@angular/core';
import type { ProduitPublic } from '@lce/contrats';
import { Favoris } from '../etat/favoris';
import { Notifications } from '../etat/notifications';
import { Panier } from '../etat/panier';

/** Ajout au panier et favoris depuis n'importe quelle carte, avec confirmation. */
@Injectable({ providedIn: 'root' })
export class ActionsProduit {
  private readonly panier = inject(Panier);
  private readonly favoris = inject(Favoris);
  private readonly notifications = inject(Notifications);

  ajouterAuPanier(produit: ProduitPublic, quantite = 1): void {
    const ajoute = this.panier.ajouter(produit, quantite);
    if (ajoute > 0) {
      this.notifications.afficher(`${produit.nom} ajouté au panier`, { libelle: 'Voir le panier', url: '/panier' });
    } else {
      this.notifications.afficher(`Stock atteint : ${produit.stock} exemplaire(s) disponible(s).`);
    }
  }

  basculerFavori(produit: ProduitPublic): void {
    const favori = this.favoris.basculer(produit.id);
    this.notifications.afficher(
      favori ? `${produit.nom} ajouté aux favoris` : `${produit.nom} retiré des favoris`,
      favori ? { libelle: 'Mes favoris', url: '/favoris' } : undefined,
    );
  }
}
