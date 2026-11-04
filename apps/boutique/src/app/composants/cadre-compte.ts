import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Icone } from '@lce/ui';
import { Notifications } from '../etat/notifications';
import { IllustrationCompte } from './illustration-compte';

/**
 * Mise en page commune à la connexion et à l'inscription : retour et partage,
 * titre et illustration à gauche, formulaire à droite, lien vers l'autre page sous l'illustration.
 */
@Component({
  selector: 'lce-cadre-compte',
  imports: [Icone, IllustrationCompte],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="arcs" viewBox="0 0 860 820" preserveAspectRatio="xMinYMax slice" aria-hidden="true">
      <circle cx="80" cy="820" r="550" />
      <circle cx="80" cy="820" r="625" />
      <circle cx="80" cy="820" r="700" />
      <circle cx="80" cy="820" r="775" />
    </svg>
    <div class="lce-conteneur cadre">
      <div class="barre">
        <button type="button" class="retour" (click)="revenir()">
          <span><lce-icone nom="chevron-gauche" [taille]="24" /></span>Retour
        </button>
        <button type="button" class="partage" aria-label="Partager cette page" (click)="partager()"><lce-icone nom="partager" [taille]="32" /></button>
      </div>
      <div class="texte">
        <h1>{{ titre() }}</h1>
        <p>{{ sousTitre() }}</p>
      </div>
      <lce-illustration-compte />
      <div class="bas"><ng-content select="[bas]" /></div>
      <div class="droite"><ng-content /></div>
    </div>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      background: var(--lce-surface);
    }
    .arcs {
      position: absolute;
      bottom: 0;
      left: 0;
      width: min(60%, 860px);
      height: 82%;
      fill: none;
      stroke: #e9e9ec;
      stroke-width: 3;
    }
    .cadre {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 480px);
      grid-template-rows: auto auto auto auto;
      grid-template-areas:
        'barre barre'
        'texte droite'
        'illustration droite'
        'bas droite';
      column-gap: 56px;
      padding-block: 16px 56px;
    }
    .barre {
      grid-area: barre;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .retour {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--lce-noir);
      font: 700 20px/26px var(--lce-police-titre);
      cursor: pointer;

      span {
        display: grid;
        place-items: center;
        width: 60px;
        height: 60px;
        border: 2px solid var(--lce-line-fort);
        border-radius: 50%;
        background: var(--lce-surface);
      }
    }
    .partage {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border: 0;
      background: none;
      color: var(--lce-noir);
      cursor: pointer;
    }
    .texte {
      grid-area: texte;

      h1 {
        margin: 0;
        color: var(--lce-noir);
        font: 700 54px/62px var(--lce-police-titre);
        letter-spacing: -0.02em;
      }
      p {
        margin: 8px 0 0;
        color: var(--lce-ink-muted);
        font-size: 26px;
        line-height: 34px;
      }
    }
    lce-illustration-compte {
      grid-area: illustration;
      max-width: 620px;
      margin-top: 16px;
    }
    .bas {
      grid-area: bas;
      max-width: 620px;
      margin-top: 40px;
      color: var(--lce-ink-muted);
      font-size: 22px;
      line-height: 30px;
      text-align: center;
    }
    .droite {
      grid-area: droite;
      min-width: 0;
    }
    @media (max-width: 960px) {
      .arcs,
      lce-illustration-compte {
        display: none;
      }
      .cadre {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          'barre'
          'texte'
          'droite'
          'bas';
        padding-block: 12px 40px;
      }
      .retour {
        gap: 10px;
        font-size: 16px;

        span {
          width: 44px;
          height: 44px;
        }
      }
      .texte {
        margin-bottom: 24px;

        h1 {
          font-size: 34px;
          line-height: 40px;
        }
        p {
          font-size: 18px;
          line-height: 24px;
        }
      }
      .bas {
        max-width: none;
        margin-top: 24px;
        font-size: 16px;
        line-height: 24px;
      }
    }
  `,
})
export class CadreCompte {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);

  readonly titre = input.required<string>();
  readonly sousTitre = input.required<string>();

  protected revenir(): void {
    if (history.length > 1) this.location.back();
    else void this.router.navigateByUrl('/');
  }

  protected async partager(): Promise<void> {
    const url = location.origin;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title: 'Les Champs Élysées', url });
      else {
        await navigator.clipboard.writeText(url);
        this.notifications.afficher('Lien copié');
      }
    } catch {
      // Partage annulé par la personne ou presse-papiers refusé : rien à signaler.
    }
  }
}
