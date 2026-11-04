import { httpResource } from '@angular/common/http';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Accueil as DonneesAccueil } from '@lce/contrats';
import { API } from '@lce/session';
import { Badge, Bouton, FcfaPipe, Icone, NomIcone } from '@lce/ui';
import { Cartes } from '../composants/cartes';
import { ErreurChargement, Squelettes } from '../composants/etats';
import { Catalogue } from '../donnees/catalogue';

/** Fin des promotions de la semaine : dimanche 23 h 59, heure de Bamako (UTC). */
function finDeSemaine(maintenant: Date): Date {
  const fin = new Date(maintenant);
  fin.setUTCDate(fin.getUTCDate() + ((7 - fin.getUTCDay()) % 7));
  fin.setUTCHours(23, 59, 59, 0);
  return fin;
}

@Component({
  selector: 'lce-accueil',
  imports: [FormsModule, RouterLink, Badge, Bouton, Cartes, ErreurChargement, FcfaPipe, Icone, Squelettes],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil {
  protected readonly catalogue = inject(Catalogue);

  protected readonly donnees = httpResource<DonneesAccueil>(() => `${API}/accueil`);
  protected readonly a = computed(() => (this.donnees.hasValue() ? this.donnees.value() : undefined));
  protected readonly erreur = computed(() => this.donnees.status() === 'error');

  private readonly maintenant = signal(new Date());
  protected readonly decompte = computed(() => {
    const reste = Math.max(0, finDeSemaine(this.maintenant()).getTime() - this.maintenant().getTime());
    const minutes = Math.floor(reste / 60_000);
    return { jours: Math.floor(minutes / 1440), heures: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
  });

  protected email = '';
  protected readonly newsletter = signal<'saisie' | 'annonce'>('saisie');

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const minuteur = setInterval(() => this.maintenant.set(new Date()), 30_000);
      destroy.onDestroy(() => clearInterval(minuteur));
    });
  }

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  protected deuxChiffres(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected inscrireNewsletter(): void {
    // Aucun service d'envoi pour l'instant : on le dit au lieu de faire croire à une inscription.
    this.newsletter.set('annonce');
  }
}
