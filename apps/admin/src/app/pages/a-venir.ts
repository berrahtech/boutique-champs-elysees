import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bouton, Icone } from '@lce/ui';

/** Rubriques des modules suivants (commandes, livraison, finances, utilisateurs). */
@Component({
  selector: 'lce-a-venir',
  imports: [RouterLink, Bouton, Icone],
  template: `
    <div class="adm-corps">
      <section class="carte boite">
        <span class="disque"><lce-icone nom="horloge" [taille]="36" /></span>
        <span class="surtitre">Bientôt disponible</span>
        <h1>Rubrique en préparation</h1>
        <p class="attenue">Elle arrive avec le module correspondant. Le catalogue et les stocks sont déjà prêts.</p>
        <div class="outils">
          <a lceBouton variante="primaire" routerLink="/admin/produits">Voir les produits</a>
          <a lceBouton variante="clair" routerLink="/admin">Tableau de bord</a>
        </div>
      </section>
    </div>
  `,
  styles: `
    .boite {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 72px 24px;
      text-align: center;
    }
    .disque {
      display: grid;
      place-items: center;
      width: 88px;
      height: 88px;
      margin-bottom: 8px;
      border-radius: 50%;
      background: var(--lce-gold-soft);
      box-shadow: 0 0 0 10px rgb(255 180 0 / 8%);
      color: var(--lce-gold-text);
    }
    .surtitre {
      color: var(--lce-gold-text);
      font: 800 12px/16px var(--lce-police-texte);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font: 800 28px/36px var(--lce-police-titre);
    }
    p {
      max-width: 420px;
      margin: 0 0 12px;
    }
  `,
})
export class AVenir {}
