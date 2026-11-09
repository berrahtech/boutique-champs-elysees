import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** primaire = noir ; doux = fond pâle ; bleu = contour bleu ; bleu-plein ; contour ; clair = fond blanc ; fantome = contour blanc sur fond sombre. */
export type VarianteBouton = 'primaire' | 'doux' | 'bleu' | 'bleu-plein' | 'contour' | 'clair' | 'fantome';

/**
 * Bouton LCE, posé sur un vrai <button> ou <a> :
 *   <button lceBouton>Commander</button>
 */
@Component({
  // Sélecteur d'attribut voulu : le bouton reste un vrai <button> ou <a> (accessibilité).
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lceBouton], a[lceBouton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lce-bouton',
    '[class.lce-bouton--primaire]': 'variante() === "primaire"',
    '[class.lce-bouton--doux]': 'variante() === "doux"',
    '[class.lce-bouton--bleu]': 'variante() === "bleu"',
    '[class.lce-bouton--bleu-plein]': 'variante() === "bleu-plein"',
    '[class.lce-bouton--contour]': 'variante() === "contour"',
    '[class.lce-bouton--clair]': 'variante() === "clair"',
    '[class.lce-bouton--fantome]': 'variante() === "fantome"',
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
      height: 44px;
      padding-inline: var(--lce-espace-5);
      border-radius: var(--lce-rayon-controle);
      border: 1px solid transparent;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 150ms, color 150ms, transform 100ms;

      @media (max-width: 767px) {
        height: var(--lce-bouton-mobile);
      }
    }
    :host(.lce-bouton--petit) {
      height: 36px;
      padding-inline: 14px;
      font-size: 13px;
    }
    :host(.lce-bouton--plein) {
      width: 100%;
    }
    :host(.lce-bouton--primaire) {
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    :host(.lce-bouton--primaire:hover) {
      background: var(--lce-noir);
    }
    :host(:active:not([disabled])) {
      transform: scale(0.98);
    }
    :host(.lce-bouton--bleu) {
      background: var(--lce-surface);
      color: var(--lce-navy-500);
      border-color: var(--lce-navy-500);
    }
    :host(.lce-bouton--bleu:hover) {
      background: var(--lce-primaire-soft);
    }
    :host(.lce-bouton--bleu-plein) {
      background: var(--lce-navy-500);
      color: var(--lce-on-navy);
    }
    :host(.lce-bouton--bleu-plein:hover) {
      filter: brightness(0.92);
    }
    :host(.lce-bouton--doux) {
      background: var(--lce-primaire-soft);
      color: var(--lce-navy);
    }
    :host(.lce-bouton--doux:hover) {
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    :host(.lce-bouton--contour) {
      background: transparent;
      color: var(--lce-navy);
      border-color: var(--lce-navy);
    }
    :host(.lce-bouton--contour:hover) {
      background: var(--lce-surface-douce);
    }
    :host(.lce-bouton--clair) {
      background: var(--lce-surface);
      color: var(--lce-navy);
      border-color: var(--lce-line);
    }
    :host(.lce-bouton--fantome) {
      background: transparent;
      color: var(--lce-on-navy);
      border-color: rgb(255 255 255 / 60%);
    }
    :host(.lce-bouton--fantome:hover) {
      background: rgb(255 255 255 / 8%);
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
  readonly variante = input<VarianteBouton>('primaire');
  readonly petit = input(false);
  readonly pleineLargeur = input(false);
}
