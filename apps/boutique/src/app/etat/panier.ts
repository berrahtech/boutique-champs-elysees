import { computed, inject, Injectable } from '@angular/core';
import { Catalogue, Produit } from '../donnees/catalogue';
import { signalPersistant } from './stockage-local';

export interface LignePanier {
  produitId: string;
  quantite: number;
}

export interface LigneDetaillee extends LignePanier {
  produit: Produit;
  sousTotal: number;
}

const estListeDeLignes = (v: unknown): v is LignePanier[] =>
  Array.isArray(v) && v.every((l) => typeof l?.produitId === 'string' && Number.isInteger(l?.quantite) && l.quantite > 0);

/**
 * Panier du visiteur, conservé dans le navigateur. Les montants affichés ne sont
 * qu'indicatifs : le serveur recalcule tout à la commande (prix, stock, remise).
 */
@Injectable({ providedIn: 'root' })
export class Panier {
  private readonly catalogue = inject(Catalogue);
  private readonly lignesBrutes = signalPersistant<LignePanier[]>('lce.panier.v1', [], estListeDeLignes);

  /** Lignes dont le produit existe encore, quantités ramenées au stock disponible. */
  readonly lignes = computed<LigneDetaillee[]>(() =>
    this.lignesBrutes().flatMap((l) => {
      const produit = this.catalogue.parId(l.produitId);
      if (!produit || produit.stock === 0) return [];
      const quantite = Math.min(l.quantite, produit.stock);
      return [{ ...l, quantite, produit, sousTotal: quantite * produit.prix }];
    }),
  );

  readonly nbArticles = computed(() => this.lignes().reduce((n, l) => n + l.quantite, 0));
  readonly sousTotal = computed(() => this.lignes().reduce((s, l) => s + l.sousTotal, 0));
  readonly estVide = computed(() => this.lignes().length === 0);

  quantiteDe(produitId: string): number {
    return this.lignesBrutes().find((l) => l.produitId === produitId)?.quantite ?? 0;
  }

  /** Ajoute au panier ; renvoie la quantité réellement ajoutée (limitée par le stock). */
  ajouter(produitId: string, quantite = 1): number {
    const produit = this.catalogue.parId(produitId);
    if (!produit || produit.stock === 0) return 0;
    const actuelle = this.quantiteDe(produitId);
    const cible = Math.min(produit.stock, actuelle + quantite);
    this.changerQuantite(produitId, cible);
    return cible - actuelle;
  }

  changerQuantite(produitId: string, quantite: number): void {
    this.lignesBrutes.update((lignes) => {
      const autres = lignes.filter((l) => l.produitId !== produitId);
      if (quantite <= 0) return autres;
      const existe = lignes.some((l) => l.produitId === produitId);
      return existe
        ? lignes.map((l) => (l.produitId === produitId ? { ...l, quantite } : l))
        : [...lignes, { produitId, quantite }];
    });
  }

  retirer(produitId: string): void {
    this.changerQuantite(produitId, 0);
  }

  vider(): void {
    this.lignesBrutes.set([]);
  }
}
