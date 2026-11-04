import { Injectable } from '@angular/core';
import { signalPersistant } from './stockage-local';

const MAXIMUM = 12;

function estListeDeTextes(valeur: unknown): valeur is string[] {
  return Array.isArray(valeur) && valeur.every((v) => typeof v === 'string');
}

/** Produits consultés sur cet appareil, du plus récent au plus ancien. */
@Injectable({ providedIn: 'root' })
export class Recents {
  readonly ids = signalPersistant<string[]>('lce-recents', [], estListeDeTextes);

  noter(id: string): void {
    this.ids.update((ids) => [id, ...ids.filter((autre) => autre !== id)].slice(0, MAXIMUM));
  }
}
