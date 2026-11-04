import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import type { CategoriePublique, ProduitPublic } from '@lce/contrats';
import { API } from '@lce/session';

export const SEUIL_PETITS_PRIX = 20_000;

/** Pourcentage de réduction arrondi, 0 sans prix barré. */
export function remiseDe(p: Pick<ProduitPublic, 'prix' | 'prixBarre'>): number {
  return p.prixBarre && p.prixBarre > p.prix ? Math.round((1 - p.prix / p.prixBarre) * 100) : 0;
}

/** Catégories du site, chargées une fois pour toute l'application. */
@Injectable({ providedIn: 'root' })
export class Catalogue {
  private readonly ressource = httpResource<CategoriePublique[]>(() => `${API}/categories`);

  readonly categories = computed(() => (this.ressource.hasValue() ? this.ressource.value() : []));

  categorie(slug: string): CategoriePublique | undefined {
    return this.categories().find((c) => c.slug === slug);
  }
}
