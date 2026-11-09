import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type TypeBadge = 'promo' | 'nouveau' | 'premium';

/** Badge produit, jaune : « −20 % », « Nouveau » ; sombre : « Premium ». */
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
      font: 700 12px/18px var(--lce-police-texte);
      white-space: nowrap;
    }
    :host(.lce-badge--promo),
    :host(.lce-badge--nouveau) {
      background: var(--lce-gold);
      color: var(--lce-on-gold);
    }
    :host(.lce-badge--premium) {
      background: var(--lce-navy);
    }
  `,
})
export class Badge {
  readonly type = input.required<TypeBadge>();
}
