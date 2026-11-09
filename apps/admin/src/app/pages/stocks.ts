import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { EcritureMouvement, LigneStock } from '@lce/contrats';
import { API, versErreurApi } from '@lce/session';
import { Bouton, Icone, NomIcone } from '@lce/ui';
import { firstValueFrom } from 'rxjs';
import { EtatStocks, LIBELLES_MOUVEMENT, signeMouvement } from '../etat-stocks';

type Onglet = 'alertes' | 'ruptures' | 'tout';

const LIBELLES_ETAT = { rupture: 'Rupture', 'sous-seuil': 'Bas', normal: 'Normal' } as const;

/** Stocks et alertes (maquette « A-Stocks »). */
@Component({
  selector: 'lce-stocks',
  imports: [DatePipe, FormsModule, RouterLink, Bouton, Icone],
  templateUrl: './stocks.html',
  styles: `
    .tableau {
      min-width: 820px;
    }
    .ajustement {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .type {
      height: 38px;
      font-size: 13px;
    }
    .quantite {
      width: 84px;
      height: 38px;
      padding: 0 10px;
      font-size: 14px;
    }
    .dispo.rupture {
      color: var(--lce-danger);
    }
    .dispo.sous-seuil {
      color: var(--lce-gold-text);
    }
    .aucun {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 40px 16px;
      text-align: center;
    }
    .aucun .icone-teinte {
      margin-bottom: 6px;
    }
    .mouvements {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .mouvements li:not(.vide) {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--adm-ligne);
    }
    .mouvements li:last-child {
      border-bottom: 0;
    }
    .mouvements .icone-teinte {
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }
    .detail {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      font-size: 14px;
      line-height: 20px;
    }
    .detail small {
      overflow: hidden;
      color: var(--lce-ink-muted);
      font-size: 12px;
      line-height: 16px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .delta {
      min-width: 48px;
      color: var(--lce-success);
      font: 800 15px/20px var(--lce-police-texte);
      text-align: right;
    }
    .moins .delta {
      color: var(--lce-danger);
    }
    @media (max-width: 640px) {
      .quand {
        display: none;
      }
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

  protected readonly etats = LIBELLES_ETAT;
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

  protected signe(type: string, quantite: number): number {
    return signeMouvement(type, quantite);
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
