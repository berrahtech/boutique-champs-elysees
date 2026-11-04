import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bouton, Icone } from '@lce/ui';

/** Rubriques des modules suivants (commandes, livraison, finances, utilisateurs). */
@Component({
  selector: 'lce-a-venir',
  imports: [RouterLink, Bouton, Icone],
  template: `
    <div class="adm-corps boite">
      <lce-icone nom="information" [taille]="48" />
      <h1>Rubrique en préparation</h1>
      <p class="attenue">Elle arrive avec le module correspondant. Le catalogue et les stocks sont déjà disponibles.</p>
      <a lceBouton variante="nuit" routerLink="/admin/produits">Voir les produits</a>
    </div>
  `,
  styles: `
    .boite {
      align-items: center;
      padding-block: 72px;
      text-align: center;
    }
    lce-icone {
      color: var(--lce-gold-deep);
    }
    h1 {
      margin: 0;
      font: 600 28px/36px var(--lce-police-titre);
    }
    p {
      margin: 0;
    }
  `,
})
export class AVenir {}
