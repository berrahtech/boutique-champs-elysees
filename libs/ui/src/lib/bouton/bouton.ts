import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type VarianteBouton = 'or' | 'nuit' | 'contour' | 'clair';

/**
 * Bouton LCE, posé sur un vrai <button> ou <a> :
 *   <button lceBouton variante="or">Commander</button>
 * Un seul bouton « or » par écran visible : c'est l'action principale.
 */
@Component({
  // Sélecteur d'attribut voulu : le bouton reste un vrai <button> ou <a> (accessibilité).
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lceBouton], a[lceBouton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lce-bouton',
    '[class.lce-bouton--or]': 'variante() === "or"',
    '[class.lce-bouton--nuit]': 'variante() === "nuit"',
    '[class.lce-bouton--contour]': 'variante() === "contour"',
    '[class.lce-bouton--clair]': 'variante() === "clair"',
    '[class.lce-bouton--petit]': 'petit()',
    '[class.lce-bouton--plein]': 'pleineLargeur()',
  },
  template: '<ng-content />',
  styles: `
    @use 'typographie' as t;

    :host {
      @include t.texte-label;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--lce-espace-2);
      height: 48px;
      padding-inline: var(--lce-espace-5);
      border-radius: var(--lce-rayon-controle);
      border: 1px solid transparent;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 150ms, box-shadow 150ms;

      @media (max-width: 767px) {
        height: var(--lce-bouton-mobile);
      }
    }
    :host(.lce-bouton--petit) {
      height: 36px;
      padding-inline: var(--lce-espace-4);
    }
    :host(.lce-bouton--plein) {
      width: 100%;
    }
    :host(.lce-bouton--or) {
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      border-color: var(--lce-gold-deep);
    }
    :host(.lce-bouton--or:hover) {
      background: var(--lce-gold-bright);
      box-shadow: var(--lce-ombre-gold);
    }
    :host(.lce-bouton--nuit) {
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    :host(.lce-bouton--nuit:hover) {
      background: var(--lce-navy-700);
    }
    :host(.lce-bouton--contour) {
      background: transparent;
      color: var(--lce-navy);
      border-color: var(--lce-navy);
    }
    :host(.lce-bouton--contour:hover) {
      background: var(--lce-surface-ivoire);
    }
    :host(.lce-bouton--clair) {
      background: var(--lce-surface);
      color: var(--lce-navy);
      border-color: var(--lce-line);
    }
    :host([disabled]),
    :host([aria-disabled='true']) {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
  `,
})
export class Bouton {
  readonly variante = input<VarianteBouton>('nuit');
  readonly petit = input(false);
  readonly pleineLargeur = input(false);
}
