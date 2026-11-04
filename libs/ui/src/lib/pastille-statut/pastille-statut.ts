import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FamilleStatut } from './statuts';

/**
 * Pastille de statut : point de couleur + libellé. Le statut n'est jamais
 * porté par la couleur seule.
 *   <lce-pastille-statut [statut]="STATUTS_COMMANDE[commande.statut]" />
 */
@Component({
  selector: 'lce-pastille-statut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"lce-pastille--" + statut().famille' },
  template: `<span class="point" aria-hidden="true"></span>{{ statut().libelle }}`,
  styles: `
    @use 'typographie' as t;

    :host {
      @include t.texte-small;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      border-radius: var(--lce-rayon-pastille);
      white-space: nowrap;
    }
    .point {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    :host(.lce-pastille--en-cours) {
      background: var(--lce-info-soft);
      color: var(--lce-navy-500);
    }
    :host(.lce-pastille--termine) {
      background: var(--lce-success-soft);
      color: var(--lce-success);
    }
    :host(.lce-pastille--attente) {
      background: var(--lce-primaire-soft);
      color: var(--lce-navy-500);
    }
    :host(.lce-pastille--echec) {
      background: var(--lce-danger-soft);
      color: var(--lce-danger);
    }
    :host(.lce-pastille--inactif) {
      background: var(--lce-neutre-soft);
      color: var(--lce-ink-muted);
    }
  `,
})
export class PastilleStatut {
  readonly statut = input.required<{ libelle: string; famille: FamilleStatut }>();
}
