import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  lien?: { libelle: string; url: string };
}

/** Messages brefs (« Ajouté au panier »), lus par les lecteurs d'écran. */
@Injectable({ providedIn: 'root' })
export class Notifications {
  private compteur = 0;
  readonly courante = signal<Notification | null>(null);
  private minuteur?: ReturnType<typeof setTimeout>;

  afficher(message: string, lien?: Notification['lien']): void {
    clearTimeout(this.minuteur);
    this.courante.set({ id: ++this.compteur, message, lien });
    this.minuteur = setTimeout(() => this.courante.set(null), 4000);
  }

  fermer(): void {
    clearTimeout(this.minuteur);
    this.courante.set(null);
  }
}
