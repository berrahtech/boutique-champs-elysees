import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Icone } from '@lce/ui';

/**
 * Rangée défilante avec titre et flèches. Le défilement reste natif (doigt,
 * molette, clavier) ; les flèches disparaissent quand tout tient à l'écran.
 */
@Component({
  selector: 'lce-carrousel',
  imports: [Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tete">
      <div class="titres">
        <h2 class="titre-section">{{ titre() }}@if (accent()) {<em>{{ accent() }}</em>}</h2>
      </div>
      <ng-content select="[action]" />
      @if (debordement()) {
        <div class="fleches">
          <button type="button" [disabled]="auDebut()" [attr.aria-label]="titre() + (accent() ?? '') + ' : précédent'" (click)="defiler(-1)">
            <lce-icone nom="chevron-gauche" [taille]="18" />
          </button>
          <button type="button" [disabled]="aLaFin()" [attr.aria-label]="titre() + (accent() ?? '') + ' : suivant'" (click)="defiler(1)">
            <lce-icone nom="chevron-droite" [taille]="18" />
          </button>
        </div>
      }
    </div>
    <div #piste class="piste" (scroll)="mesurer()">
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .tete {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    .titres {
      flex: 1;
      min-width: 0;
    }
    .fleches {
      flex: none;
      display: flex;
      gap: 8px;
    }
    button {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--lce-surface);
      border: 1px solid var(--lce-line);
      color: var(--lce-ink);
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: var(--lce-primaire-soft);
    }
    button:disabled {
      color: var(--lce-line-fort);
      cursor: default;
    }
    .piste {
      margin: -6px;
      padding: 6px;
      overflow-x: auto;
      scroll-behavior: smooth;
      scroll-snap-type: x proximity;
      scroll-padding-inline: 6px;
      scrollbar-width: none;
    }
    .piste::-webkit-scrollbar {
      display: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .piste {
        scroll-behavior: auto;
      }
    }
    @media (max-width: 767px) {
      .fleches {
        display: none;
      }
    }
  `,
})
export class Carrousel {
  readonly titre = input.required<string>();
  /** Fin du titre, en jaune. */
  readonly accent = input<string>();

  private readonly piste = viewChild.required<ElementRef<HTMLElement>>('piste');

  protected readonly debordement = signal(false);
  protected readonly auDebut = signal(true);
  protected readonly aLaFin = signal(false);

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const observateur = new ResizeObserver(() => this.mesurer());
      const element = this.piste().nativeElement;
      observateur.observe(element);
      // Le contenu arrive après le premier rendu : sa taille compte aussi.
      if (element.firstElementChild) observateur.observe(element.firstElementChild);
      destroy.onDestroy(() => observateur.disconnect());
    });
  }

  protected mesurer(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.piste().nativeElement;
    this.debordement.set(scrollWidth > clientWidth + 1);
    this.auDebut.set(scrollLeft <= 1);
    this.aLaFin.set(scrollLeft + clientWidth >= scrollWidth - 1);
  }

  protected defiler(sens: 1 | -1): void {
    const element = this.piste().nativeElement;
    element.scrollBy({ left: sens * element.clientWidth * 0.9 });
  }
}
