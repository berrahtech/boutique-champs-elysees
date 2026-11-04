import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Bouton, Icone } from '@lce/ui';

/** Squelettes de cartes pendant le chargement (état exigé par le dossier UX sur chaque liste). */
@Component({
  selector: 'lce-squelettes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'colonnes()', role: 'status', 'aria-label': 'Chargement des produits' },
  template: `
    @for (n of cases(); track n) {
      <div class="carte" aria-hidden="true">
        <div class="visuel"></div>
        <div class="ligne courte"></div>
        <div class="ligne"></div>
        <div class="ligne moyenne"></div>
      </div>
    }
  `,
  styles: `
    .carte {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 16px;
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-carte);
      overflow: hidden;
    }
    .visuel {
      aspect-ratio: 1;
      background: var(--lce-surface-ivoire);
      animation: pulse 1.2s ease-in-out infinite;
    }
    .ligne {
      height: 14px;
      margin-inline: 16px;
      border-radius: 4px;
      background: var(--lce-line);
      animation: pulse 1.2s ease-in-out infinite;
    }
    .courte {
      width: 35%;
    }
    .moyenne {
      width: 55%;
    }
    @keyframes pulse {
      50% {
        opacity: 0.5;
      }
    }
  `,
})
export class Squelettes {
  readonly colonnes = input<'grille-4' | 'grille-3'>('grille-4');
  readonly nombre = input(4);
  protected cases(): number[] {
    return Array.from({ length: this.nombre() }, (_, i) => i);
  }
}

/** Erreur de chargement : dit quoi faire et propose de réessayer. */
@Component({
  selector: 'lce-erreur-chargement',
  imports: [Bouton, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panneau-ivoire boite" role="alert">
      <lce-icone nom="wifi-off" [taille]="44" />
      <h2 class="titre-3">{{ titre() }}</h2>
      <p class="attenue">Vérifiez votre connexion internet puis réessayez.</p>
      <button lceBouton variante="nuit" type="button" (click)="reessayer.emit()">Réessayer</button>
    </div>
  `,
  styles: `
    .boite {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 24px;
      text-align: center;
    }
    lce-icone {
      color: var(--lce-gold-deep);
    }
    p {
      margin: 0;
    }
  `,
})
export class ErreurChargement {
  readonly titre = input('Impossible de charger les produits');
  readonly reessayer = output<void>();
}
