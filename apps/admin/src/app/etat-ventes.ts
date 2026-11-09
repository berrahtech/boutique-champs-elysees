import { httpResource } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, linkedSignal } from '@angular/core';
import type { ResumeVentes } from '@lce/contrats';
import { API, Session } from '@lce/session';

/** Toutes les minutes : une nouvelle commande apparaît sans recharger la page. */
const ACTUALISATION_MS = 60_000;

/** Résumé des ventes partagé : pastille du menu et tableau de bord. */
@Injectable({ providedIn: 'root' })
export class EtatVentes {
  private readonly session = inject(Session);

  readonly ressource = httpResource<ResumeVentes>(() => (this.session.permissions().has('commande.voir') ? `${API}/admin/ventes/resume` : undefined));
  readonly resume = linkedSignal<ResumeVentes | undefined, ResumeVentes | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });
  readonly aTraiter = computed(() => this.resume()?.aTraiter ?? 0);

  constructor() {
    const minuteur = setInterval(() => {
      if (this.session.permissions().has('commande.voir') && document.visibilityState === 'visible') this.ressource.reload();
    }, ACTUALISATION_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(minuteur));
  }

  recharger(): void {
    this.ressource.reload();
  }
}
