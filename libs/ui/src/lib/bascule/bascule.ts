import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Bascule on / off (ex. « Disponible », « Boutique ouverte »). Vert quand active.
 * Toujours un libellé accessible, visible ou non.
 */
@Component({
  selector: 'lce-bascule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="active()"
      [attr.aria-label]="libelleVisible() ? null : libelle()"
      [disabled]="desactivee()"
      (click)="active.set(!active())"
    >
      <span class="piste" aria-hidden="true"><span class="curseur"></span></span>
      @if (libelleVisible()) {
        <span class="libelle">{{ libelle() }}</span>
      }
    </button>
  `,
  styles: `
    @use 'typographie' as t;

    button {
      @include t.texte-body;
      display: inline-flex;
      align-items: center;
      gap: var(--lce-espace-3);
      min-height: var(--lce-cible-tactile);
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .piste {
      position: relative;
      width: 44px;
      height: 24px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-line);
      transition: background-color 150ms;
    }
    .curseur {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--lce-surface);
      transition: transform 150ms;
    }
    [aria-checked='true'] .piste {
      background: var(--lce-success);
    }
    [aria-checked='true'] .curseur {
      transform: translateX(20px);
    }
  `,
})
export class Bascule {
  readonly active = model(false);
  readonly libelle = input.required<string>();
  readonly libelleVisible = input(true);
  readonly desactivee = input(false);
}
