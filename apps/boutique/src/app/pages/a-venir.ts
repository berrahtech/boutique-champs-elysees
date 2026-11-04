import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bouton, Icone, NomIcone } from '@lce/ui';

/**
 * Pages prévues mais pas encore construites (aide, contact, suivi, pages légales),
 * et page introuvable. Mieux qu'un lien mort : on dit ce qui arrive et où aller.
 */
@Component({
  selector: 'lce-a-venir',
  imports: [RouterLink, Bouton, Icone],
  template: `
    <div class="a-venir">
      <lce-icone [nom]="icone()" [taille]="48" />
      <h1 class="titre-2">{{ titre() }}</h1>
      @if (texte()) {
        <p class="attenue">{{ texte() }}</p>
      }
      <a lceBouton variante="primaire" routerLink="/">Accueil</a>
    </div>
  `,
  styles: `
    lce-icone {
      color: var(--lce-navy);
    }
  `,
})
export class AVenir {
  readonly titre = input('Bientôt disponible');
  readonly texte = input('Bientôt disponible.');
  readonly icone = input<NomIcone>('information');
}
