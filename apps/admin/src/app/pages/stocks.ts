import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EcritureMouvement, LigneStock } from '@lce/contrats';
import { API, versErreurApi } from '@lce/session';
import { Bouton, Icone, NomIcone, PastilleStatut } from '@lce/ui';
import { firstValueFrom } from 'rxjs';
import { EtatStocks } from '../etat-stocks';

type Onglet = 'alertes' | 'ruptures' | 'tout';

const STATUT_ETAT = {
  rupture: { libelle: 'Rupture', famille: 'echec' },
  'sous-seuil': { libelle: 'Sous le seuil', famille: 'attente' },
  normal: { libelle: 'Normal', famille: 'termine' },
} as const;

const LIBELLES_MOUVEMENT: Record<string, string> = {
  ENTREE: 'Réception',
  SORTIE: 'Sortie',
  RESERVATION: 'Réservation',
  LIBERATION: 'Libération',
  REINTEGRATION: 'Retour à l’entrepôt',
  INVENTAIRE: 'Correction d’inventaire',
};

/** Stocks et alertes (maquette « A-Stocks »). */
@Component({
  selector: 'lce-stocks',
  imports: [DatePipe, FormsModule, Bouton, Icone, PastilleStatut],
  templateUrl: './stocks.html',
  styles: `
    .ajustement {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .quantite {
      width: 84px;
      height: 36px;
      padding: 0 10px;
      font-size: 14px;
    }
    .type {
      height: 36px;
    }
    .rupture {
      color: var(--lce-danger);
    }
    .sous-seuil {
      color: var(--lce-navy-500);
    }
    .plus {
      color: var(--lce-success);
    }
    .moins {
      color: var(--lce-danger);
    }
    .carte .tableau {
      min-width: 640px;
    }
  `,
})
export class Stocks {
  private readonly http = inject(HttpClient);

  private readonly etat = inject(EtatStocks);
  protected readonly ressource = this.etat.ressource;
  protected readonly vue = this.etat.vue;

  protected readonly onglet = signal<Onglet>('alertes');
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly envoi = signal<string | null>(null);
  /** Saisie par ligne : quantité et type de mouvement. */
  protected readonly saisies = signal<Record<string, { quantite: number | null; type: EcritureMouvement['type'] }>>({});

  protected readonly etats = STATUT_ETAT;
  protected readonly onglets = computed(() => {
    const l = this.vue()?.lignes ?? [];
    return [
      { id: 'alertes' as const, libelle: 'Alertes', nombre: l.filter((x) => x.etat !== 'normal').length },
      { id: 'ruptures' as const, libelle: 'Ruptures', nombre: l.filter((x) => x.etat === 'rupture').length },
      { id: 'tout' as const, libelle: 'Tous les articles', nombre: l.length },
    ];
  });
  protected readonly lignes = computed(() => {
    const l = this.vue()?.lignes ?? [];
    switch (this.onglet()) {
      case 'alertes':
        return l.filter((x) => x.etat !== 'normal');
      case 'ruptures':
        return l.filter((x) => x.etat === 'rupture');
      default:
        return l;
    }
  });

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  protected libelleMouvement(type: string): string {
    return LIBELLES_MOUVEMENT[type] ?? type;
  }

  /** Sortie et réservation retirent du stock ; l'inventaire porte déjà son signe. */
  protected signe(type: string, quantite: number): number {
    return type === 'SORTIE' || type === 'RESERVATION' ? -quantite : quantite;
  }

  protected saisie(id: string) {
    return this.saisies()[id] ?? { quantite: null, type: 'ENTREE' as const };
  }

  protected changerSaisie(id: string, changement: Partial<{ quantite: number | null; type: EcritureMouvement['type'] }>): void {
    this.saisies.update((s) => ({ ...s, [id]: { ...this.saisie(id), ...changement } }));
  }

  protected async valider(ligne: LigneStock): Promise<void> {
    const { quantite, type } = this.saisie(ligne.produitId);
    if (quantite == null || quantite < 0 || (type !== 'INVENTAIRE' && quantite === 0)) {
      this.erreur.set(`${ligne.nom} : saisissez une quantité.`);
      return;
    }
    this.erreur.set(null);
    this.message.set(null);
    this.envoi.set(ligne.produitId);
    try {
      const corps: EcritureMouvement = { type, quantite };
      await firstValueFrom(this.http.post(`${API}/admin/stocks/${ligne.produitId}/mouvements`, corps));
      this.changerSaisie(ligne.produitId, { quantite: null });
      this.message.set(`${ligne.nom} : stock mis à jour.`);
      this.etat.recharger();
    } catch (e) {
      this.erreur.set(`${ligne.nom} : ${versErreurApi(e).messageUtilisateur}`);
    } finally {
      this.envoi.set(null);
    }
  }
}
