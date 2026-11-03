import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Icone } from '../icone/icone';

/** Sélecteur de quantité : min 1, max = stock disponible. */
@Component({
  selector: 'lce-quantite',
  imports: [Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qte" role="group" [attr.aria-label]="libelle()">
      <button type="button" [disabled]="valeur() <= min()" (click)="changer(-1)" aria-label="Diminuer la quantité">
        <lce-icone nom="moins" [taille]="18" />
      </button>
      <output aria-live="polite">{{ valeur() }}</output>
      <button type="button" [disabled]="valeur() >= max()" (click)="changer(1)" aria-label="Augmenter la quantité">
        <lce-icone nom="plus" [taille]="18" />
      </button>
    </div>
  `,
  styles: `
    @use 'typographie' as t;

    .qte {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-controle);
    }
    button {
      display: grid;
      place-items: center;
      width: var(--lce-cible-tactile);
      height: var(--lce-cible-tactile);
      border: 0;
      background: none;
      color: var(--lce-navy);
      cursor: pointer;
    }
    button:disabled {
      color: var(--lce-line);
      cursor: not-allowed;
    }
    output {
      @include t.texte-label;
      min-width: 32px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class Quantite {
  readonly valeur = model(1);
  readonly min = input(1);
  readonly max = input(99);
  readonly libelle = input('Quantité');

  protected changer(pas: number): void {
    const suivante = Math.min(this.max(), Math.max(this.min(), this.valeur() + pas));
    this.valeur.set(suivante);
  }
}
