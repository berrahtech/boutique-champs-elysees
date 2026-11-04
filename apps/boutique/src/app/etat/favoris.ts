import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, PLATFORM_ID, untracked } from '@angular/core';
import { API, Session } from '@lce/session';
import { firstValueFrom } from 'rxjs';
import { signalPersistant } from './stockage-local';

const estListeDIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Produits favoris : conservés sur l'appareil, et sur le compte une fois connecté. */
@Injectable({ providedIn: 'root' })
export class Favoris {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly ids = signalPersistant<string[]>('lce.favoris.v2', [], estListeDIds);
  private etaitConnecte = false;

  readonly ensemble = computed(() => new Set(this.ids()));
  readonly nombre = computed(() => this.ids().length);
  readonly liste = this.ids.asReadonly();

  constructor() {
    if (!this.navigateur) return;
    effect(() => {
      const connecte = this.session.connecte();
      untracked(() => {
        if (connecte) void this.fusionner();
        else if (this.etaitConnecte) this.ids.set([]);
        this.etaitConnecte = connecte;
      });
    });
  }

  contient(id: string): boolean {
    return this.ensemble().has(id);
  }

  /** Ajoute ou retire ; renvoie true si le produit est désormais favori. */
  basculer(id: string): boolean {
    const present = this.contient(id);
    this.ids.update((ids) => (present ? ids.filter((x) => x !== id) : [...ids, id]));
    if (this.session.connecte()) {
      const envoi = present
        ? this.http.delete(`${API}/favoris/${id}`)
        : this.http.post(`${API}/favoris`, { produitIds: [id] });
      envoi.subscribe({ error: () => undefined });
    }
    return !present;
  }

  private async fusionner(): Promise<void> {
    try {
      const fusion = await firstValueFrom(
        this.http.post<string[]>(`${API}/favoris`, { produitIds: this.ids() }),
      );
      this.ids.set(fusion);
    } catch {
      // Compte injoignable : les favoris locaux restent utilisables.
    }
  }
}
