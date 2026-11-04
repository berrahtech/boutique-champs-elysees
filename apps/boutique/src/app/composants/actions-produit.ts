import { inject, Injectable } from '@angular/core';
import { Catalogue } from '../donnees/catalogue';
import { Favoris } from '../etat/favoris';
import { Notifications } from '../etat/notifications';
import { Panier } from '../etat/panier';

/** Ajout au panier et favoris depuis n'importe quelle carte, avec confirmation. */
@Injectable({ providedIn: 'root' })
export class ActionsProduit {
  private readonly catalogue = inject(Catalogue);
  private readonly panier = inject(Panier);
  private readonly favoris = inject(Favoris);
  private readonly notifications = inject(Notifications);

  ajouterAuPanier(id: string, quantite = 1): void {
    const produit = this.catalogue.parId(id);
    if (!produit) return;
    const ajoute = this.panier.ajouter(id, quantite);
    if (ajoute > 0) {
      this.notifications.afficher(`${produit.nom} ajouté au panier`, { libelle: 'Voir le panier', url: '/panier' });
    } else {
      this.notifications.afficher(`Stock atteint : ${produit.stock} exemplaire(s) disponible(s).`);
    }
  }

  basculerFavori(id: string): void {
    const produit = this.catalogue.parId(id);
    if (!produit) return;
    const favori = this.favoris.basculer(id);
    this.notifications.afficher(
      favori ? `${produit.nom} ajouté aux favoris` : `${produit.nom} retiré des favoris`,
      favori ? { libelle: 'Mes favoris', url: '/favoris' } : undefined,
    );
  }
}
