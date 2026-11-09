import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Accueil } from '@lce/contrats';
import { API } from '@lce/session';

/**
 * Données de la page d'accueil, gardées en mémoire : au retour, la page s'affiche
 * aussitôt, à la bonne position de défilement, puis se met à jour en arrière-plan.
 */
@Injectable({ providedIn: 'root' })
export class Vitrine {
  readonly donnees = httpResource<Accueil>(() => `${API}/accueil`);
}
