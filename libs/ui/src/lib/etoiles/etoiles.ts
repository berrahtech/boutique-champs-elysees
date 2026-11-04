import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icone } from '../icone/icone';

/** Note sur 5 en étoiles, lue « Note 4,3 sur 5 » par les lecteurs d'écran. */
@Component({
  selector: 'lce-etoiles',
  imports: [Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', '[attr.aria-label]': 'libelle()' },
  template: `
    @for (pleine of etoiles(); track $index) {
      <lce-icone nom="etoile" [taille]="taille()" [plein]="pleine" />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 2px;
      color: var(--lce-etoile);
    }
  `,
})
export class Etoiles {
  readonly note = input.required<number>();
  readonly taille = input(14);

  protected readonly etoiles = computed(() => [1, 2, 3, 4, 5].map((i) => i <= Math.round(this.note())));
  protected readonly libelle = computed(() => `Note ${this.note().toLocaleString('fr-FR')} sur 5`);
}
