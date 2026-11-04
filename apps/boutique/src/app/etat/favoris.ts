import { computed, Injectable } from '@angular/core';
import { signalPersistant } from './stockage-local';

const estListeDIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Produits favoris, conservés dans le navigateur. */
@Injectable({ providedIn: 'root' })
export class Favoris {
  private readonly ids = signalPersistant<string[]>('lce.favoris.v1', [], estListeDIds);

  readonly ensemble = computed(() => new Set(this.ids()));
  readonly nombre = computed(() => this.ids().length);
  readonly liste = this.ids.asReadonly();

  contient(id: string): boolean {
    return this.ensemble().has(id);
  }

  /** Ajoute ou retire ; renvoie true si le produit est désormais favori. */
  basculer(id: string): boolean {
    const present = this.contient(id);
    this.ids.update((ids) => (present ? ids.filter((x) => x !== id) : [...ids, id]));
    return !present;
  }
}
