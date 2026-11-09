import { Component, input, output } from '@angular/core';
import { Icone } from '@lce/ui';

/**
 * Panneau latéral pour les formulaires de création et de modification.
 * La page reste visible derrière : on garde le contexte en éditant.
 */
@Component({
  selector: 'lce-panneau',
  imports: [Icone],
  host: { '(document:keydown.escape)': 'fermer.emit()' },
  template: `
    <div class="voile" aria-hidden="true" (click)="fermer.emit()"></div>
    <section class="panneau" role="dialog" aria-modal="true" [attr.aria-label]="titre()">
      <header>
        <div class="empile">
          <h2>{{ titre() }}</h2>
          @if (sousTitre()) {
            <span class="petit attenue">{{ sousTitre() }}</span>
          }
        </div>
        <button type="button" class="fermer" aria-label="Fermer" (click)="fermer.emit()"><lce-icone nom="fermer" [taille]="20" /></button>
      </header>
      <div class="contenu"><ng-content /></div>
      <footer><ng-content select="[pied]" /></footer>
    </section>
  `,
  styles: `
    :host {
      position: fixed;
      z-index: 50;
      inset: 0;
    }
    .voile {
      position: absolute;
      inset: 0;
      background: rgb(17 19 21 / 40%);
      animation: apparition 200ms ease both;
    }
    .panneau {
      position: absolute;
      inset: 0 0 0 auto;
      display: flex;
      flex-direction: column;
      width: min(480px, 100vw);
      background: var(--lce-surface);
      box-shadow: -12px 0 40px rgb(0 0 0 / 18%);
      animation: glissement 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 24px 18px;
      border-bottom: 1px solid var(--adm-ligne);
    }
    h2 {
      margin: 0;
      font: 800 20px/28px var(--lce-police-titre);
    }
    .fermer {
      display: grid;
      place-items: center;
      flex: none;
      width: 40px;
      height: 40px;
      margin: -6px -8px 0 0;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--lce-ink-muted);
      cursor: pointer;
    }
    .fermer:hover {
      background: var(--lce-neutre-soft);
      color: var(--lce-ink);
    }
    .contenu {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 18px;
      overflow-y: auto;
      padding: 22px 24px;
    }
    footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid var(--adm-ligne);
      background: #fafafb;
    }
    footer:empty {
      display: none;
    }
    @keyframes apparition {
      from {
        opacity: 0;
      }
    }
    @keyframes glissement {
      from {
        transform: translateX(40px);
        opacity: 0;
      }
    }
  `,
})
export class Panneau {
  readonly titre = input.required<string>();
  readonly sousTitre = input<string>();
  readonly fermer = output<void>();
}
