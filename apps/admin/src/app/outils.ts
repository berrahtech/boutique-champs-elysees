import { WritableSignal } from '@angular/core';
import { versErreurApi } from '@lce/session';
import { firstValueFrom, Observable } from 'rxjs';

/**
 * Envoie une requête et range le message d'erreur dans `erreur` en cas d'échec.
 * Renvoie la réponse, ou undefined si la requête a échoué.
 */
export async function envoyer<T>(requete: Observable<T>, erreur: WritableSignal<string | null>, envoi?: WritableSignal<boolean>): Promise<T | undefined> {
  erreur.set(null);
  envoi?.set(true);
  try {
    return await firstValueFrom(requete);
  } catch (e) {
    const api = versErreurApi(e);
    erreur.set(api.details.detail ? `${api.messageUtilisateur}. ${api.details.detail}` : api.messageUtilisateur);
    return undefined;
  } finally {
    envoi?.set(false);
  }
}

/** « 2026-11-09T… » → valeur d'un champ date (AAAA-MM-JJ). */
export function versChampDate(iso: string): string {
  return iso.slice(0, 10);
}

export function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .map((m) => m[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
