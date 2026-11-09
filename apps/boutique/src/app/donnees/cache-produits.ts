import { Injectable } from '@angular/core';
import type { ProduitPublic } from '@lce/contrats';

/**
 * Derniers produits vus dans les listes. La fiche s'affiche tout de suite avec ces
 * données, puis l'API les remplace (stock et prix à jour, produits similaires).
 */
@Injectable({ providedIn: 'root' })
export class CacheProduits {
  private readonly parSlug = new Map<string, ProduitPublic>();

  retenir(produits: ProduitPublic[]): void {
    for (const p of produits) this.parSlug.set(p.slug, p);
  }

  lire(slug: string): ProduitPublic | undefined {
    return this.parSlug.get(slug);
  }
}
