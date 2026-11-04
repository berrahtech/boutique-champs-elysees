import { isPlatformBrowser } from '@angular/common';
import { effect, inject, PLATFORM_ID, signal, WritableSignal } from '@angular/core';

/**
 * Signal enregistré dans le navigateur (panier et favoris restent disponibles
 * hors connexion, puis seront synchronisés avec le compte).
 * Côté serveur (SSR) ou si le stockage est bloqué, il vaut simplement `initial`.
 */
export function signalPersistant<T>(cle: string, initial: T, valider: (valeur: unknown) => valeur is T): WritableSignal<T> {
  const navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  const etat = signal<T>(initial);

  if (navigateur) {
    try {
      const brut = localStorage.getItem(cle);
      const valeur: unknown = brut ? JSON.parse(brut) : null;
      if (valeur !== null && valider(valeur)) etat.set(valeur);
    } catch {
      // Stockage indisponible (navigation privée, quota) : on garde l'état initial.
    }
    effect(() => {
      const valeur = etat();
      try {
        localStorage.setItem(cle, JSON.stringify(valeur));
      } catch {
        // Idem : l'état reste en mémoire pour la session.
      }
    });
  }
  return etat;
}
