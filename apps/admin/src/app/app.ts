import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Session } from '@lce/session';

@Component({
  selector: 'lce-root',
  imports: [RouterOutlet],
  template: `
    @if (!session.pret()) {
      <div class="demarrage" role="status" aria-label="Chargement de l'administration">
        <img src="/logo-lce.png" alt="" width="64" height="64" />
        <span class="barre"><span></span></span>
      </div>
    }
    <router-outlet />
  `,
  styles: `
    // Pendant la reprise de session : le logo plutôt qu'une page blanche.
    .demarrage {
      position: fixed;
      z-index: 100;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      background: var(--lce-adm-bg);
      animation: apparition 300ms 150ms ease both;
    }
    img {
      object-fit: contain;
    }
    .barre {
      width: 120px;
      height: 3px;
      overflow: hidden;
      border-radius: 3px;
      background: var(--lce-line);
    }
    .barre span {
      display: block;
      width: 40%;
      height: 100%;
      border-radius: inherit;
      background: var(--lce-gold);
      animation: va-et-vient 1s ease-in-out infinite alternate;
    }
    @keyframes apparition {
      from {
        opacity: 0;
      }
    }
    @keyframes va-et-vient {
      from {
        transform: translateX(-20%);
      }
      to {
        transform: translateX(170%);
      }
    }
  `,
})
export class App {
  protected readonly session = inject(Session);

  constructor() {
    void this.session.reprendre();
  }
}
