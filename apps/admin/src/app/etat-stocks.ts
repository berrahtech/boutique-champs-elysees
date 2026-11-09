import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, linkedSignal } from '@angular/core';
import type { VueStocks } from '@lce/contrats';
import { API, Session } from '@lce/session';

export const LIBELLES_MOUVEMENT: Record<string, string> = {
  ENTREE: 'Réception',
  SORTIE: 'Sortie',
  RESERVATION: 'Réservation',
  LIBERATION: 'Libération',
  REINTEGRATION: 'Retour à l’entrepôt',
  INVENTAIRE: 'Correction d’inventaire',
};

/** Sortie et réservation retirent du stock ; l'inventaire porte déjà son signe. */
export function signeMouvement(type: string, quantite: number): number {
  return type === 'SORTIE' || type === 'RESERVATION' ? -quantite : quantite;
}

/** Vue des stocks partagée : menu, tableau de bord et page Stocks affichent les mêmes chiffres. */
@Injectable({ providedIn: 'root' })
export class EtatStocks {
  private readonly session = inject(Session);

  readonly ressource = httpResource<VueStocks>(() =>
    this.session.permissions().has('stock.ajuster') ? `${API}/admin/stocks` : undefined,
  );
  /** Dernière vue connue : rien ne clignote pendant un rechargement. */
  readonly vue = linkedSignal<VueStocks | undefined, VueStocks | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (valeur, precedent) => valeur ?? precedent?.value,
  });
  readonly alertes = computed(() => {
    const i = this.vue()?.indicateurs;
    return (i?.ruptures ?? 0) + (i?.sousSeuil ?? 0);
  });

  recharger(): void {
    this.ressource.reload();
  }
}
