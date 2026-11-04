import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type TypeBadge = 'promo' | 'nouveau' | 'premium';

/** Badge produit : pastille rouge « −20 % », étiquette violette « Nouveauté », « Premium ». */
@Component({
  selector: 'lce-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"lce-badge--" + type()' },
  template: '<ng-content />',
  styles: `
    :host {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--lce-rayon-badge);
      color: var(--lce-on-navy);
      font: 600 12px/18px var(--lce-police-texte);
      white-space: nowrap;
    }
    :host(.lce-badge--promo) {
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-promo);
    }
    :host(.lce-badge--nouveau) {
      background: var(--lce-nouveaute);
    }
    :host(.lce-badge--premium) {
      background: var(--lce-navy);
    }
  `,
})
export class Badge {
  readonly type = input.required<TypeBadge>();
}
