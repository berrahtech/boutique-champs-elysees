import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icone } from '../icone/icone';

export interface Coordonnees {
  telephone: string;
  email: string;
  adresse: string;
  horaires: string;
}

/** Pied de page (maquette « Footer ») : présentation, liens, coordonnées, moyens de paiement, liens légaux. */
@Component({
  selector: 'lce-pied-de-page',
  imports: [RouterLink, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <div class="lce-conteneur interieur">
        <div class="colonnes">
          <a routerLink="/" class="marque" aria-label="Les Champs Élysées, accueil">
            <img src="/logo-lce.png" alt="" width="48" height="48" />
            <span>Les Champs Élysées</span>
          </a>
          <nav aria-labelledby="pied-boutique">
            <h2 id="pied-boutique">Boutique</h2>
            <a routerLink="/promotions">Promotions</a>
            <a routerLink="/boutique" [queryParams]="{ filtre: 'nouveautes' }">Nouveautés</a>
          </nav>
          <nav aria-labelledby="pied-aide">
            <h2 id="pied-aide">Aide</h2>
            <a routerLink="/compte/commandes">Suivi de commande</a>
            <a routerLink="/aide">FAQ</a>
            <a routerLink="/contact">Contact</a>
          </nav>
          <div>
            <h2>Contact</h2>
            <address>
              <span><lce-icone nom="telephone" [taille]="18" /><a [href]="'tel:' + coordonnees().telephone.replace(/\\s/g, '')">{{ coordonnees().telephone }}</a></span>
              <span><lce-icone nom="email" [taille]="18" /><a [href]="'mailto:' + coordonnees().email">{{ coordonnees().email }}</a></span>
            </address>
          </div>
        </div>

        <div class="paiements">
          @for (moyen of moyens; track moyen) {
            <span class="moyen">{{ moyen }}</span>
          }
        </div>

        <div class="legal">
          <span>© {{ annee }} Les Champs Élysées</span>
          <nav aria-label="Informations légales">
            <a routerLink="/mentions-legales">Mentions légales</a>
            <a routerLink="/confidentialite">Confidentialité</a>
          </nav>
        </div>
      </div>
    </footer>
  `,
  styles: `
    footer {
      background: var(--lce-navy-700);
      color: #d7d8ee;
    }
    .interieur {
      display: flex;
      flex-direction: column;
      gap: 40px;
      padding-block: 48px 24px;
    }
    .colonnes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 32px;
    }
    .marque {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--lce-on-navy);
      text-decoration: none;
      font: 700 18px/24px var(--lce-police-titre);
    }
    .marque img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    nav[aria-labelledby] {
      display: flex;
      flex-direction: column;
    }
    h2,
    .titre {
      margin: 0 0 12px;
      font: 600 15px/20px var(--lce-police-texte);
      color: var(--lce-on-navy);
    }
    a {
      color: #d7d8ee;
      text-decoration: none;
      font-size: 14px;
      line-height: 30px;
    }
    a:hover {
      color: var(--lce-on-navy);
    }
    address {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-style: normal;
      font-size: 14px;
      line-height: 22px;
    }
    address span {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    address a {
      line-height: 22px;
    }
    .paiements {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .paiements .titre {
      margin: 0 8px 0 0;
    }
    .moyen {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 12px;
      border: 1px solid rgb(255 255 255 / 25%);
      border-radius: var(--lce-rayon-pastille);
      font: 500 12px/16px var(--lce-police-texte);
      color: #ffffff;
    }
    .legal {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px 24px;
      padding-top: 24px;
      border-top: 1px solid rgb(255 255 255 / 15%);
      font-size: 13px;
    }
    .legal nav {
      display: flex;
      gap: 24px;
    }
    .legal a {
      font-size: 13px;
      line-height: 20px;
    }
  `,
})
export class PiedDePage {
  readonly coordonnees = input.required<Coordonnees>();
  protected readonly moyens = ['Orange Money', 'Moov Money', 'Visa', 'Mastercard', 'Espèces'];
  protected readonly annee = new Date().getFullYear();
}
