import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type TypeBadge = 'promo' | 'nouveau' | 'premium';

/** Badge produit en capitales espacées : « -20 % », « Nouveau », « Premium ». */
@Component({
  selector: 'lce-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"lce-badge--" + type()' },
  template: '<ng-content />',
  styles: `
    @use 'typographie' as t;

    :host {
      @include t.texte-surtitre;
      font-size: 11px;
      display: inline-block;
      padding: 2px var(--lce-espace-2);
      border-radius: var(--lce-rayon-badge);
    }
    :host(.lce-badge--promo) {
      background: var(--lce-promo);
      color: var(--lce-on-navy);
    }
    :host(.lce-badge--nouveau) {
      background: var(--lce-gold-soft);
      color: var(--lce-gold-text);
    }
    :host(.lce-badge--premium) {
      background: var(--lce-navy);
      color: var(--lce-gold-bright);
    }
  `,
})
export class Badge {
  readonly type = input.required<TypeBadge>();
}
