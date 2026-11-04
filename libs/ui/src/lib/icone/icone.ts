import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ICONES, NomIcone } from './icones';

/**
 * Icône 24 × 24, trait 1,75 px, extrémités arrondies, couleur héritée.
 * Sans `libelle`, l'icône est décorative (aria-hidden) : le texte voisin porte le sens.
 */
@Component({
  selector: 'lce-icone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'libelle() ? "img" : null',
    '[attr.aria-label]': 'libelle() || null',
    '[attr.aria-hidden]': 'libelle() ? null : "true"',
    '[style.width.px]': 'taille()',
    '[style.height.px]': 'taille()',
  },
  // innerHTML posé sur un <span> et non sur le <svg> : le rendu serveur ne sait pas
  // remplir un élément SVG par innerHTML.
  template: `<span [innerHTML]="svg()"></span>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    span,
    span ::ng-deep svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class Icone {
  private readonly sanitizer = inject(DomSanitizer);

  readonly nom = input.required<NomIcone>();
  readonly taille = input(24);
  readonly libelle = input<string>();
  /** Remplit le tracé (étoile notée, favori actif). */
  readonly plein = input(false);

  // Les tracés viennent d'une table interne, jamais d'une saisie : sûrs à injecter.
  protected readonly svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" fill="${this.plein() ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.75" ` +
        'stroke-linecap="round" stroke-linejoin="round">' + ICONES[this.nom()] + '</svg>',
    ),
  );
}
