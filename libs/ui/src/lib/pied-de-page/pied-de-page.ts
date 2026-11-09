import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Coordonnees {
  telephone: string;
  email: string;
  adresse: string;
  horaires: string;
}

/** Pied de page sombre : logo et contact, liens, moyens de paiement, recherches populaires. */
@Component({
  selector: 'lce-pied-de-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <div class="lce-conteneur colonnes">
        <div class="contact">
          <a routerLink="/" class="marque" aria-label="Les Champs Élysées, accueil">
            <img src="/logo-lce.png" alt="" width="44" height="44" />
            <span>LES CHAMPS ÉLYSÉES</span>
          </a>
          <address>
            <span class="discret">Service client</span>
            <a class="fort" [href]="'tel:' + coordonnees().telephone.replace(/\\s/g, '')">{{ coordonnees().telephone }}</a>
            <span class="discret">{{ coordonnees().adresse }}</span>
            <a class="fort" [href]="'mailto:' + coordonnees().email">{{ coordonnees().email }}</a>
          </address>
        </div>
        <nav aria-labelledby="pied-boutique">
          <h2 id="pied-boutique">Boutique</h2>
          <a routerLink="/promotions">Promotions</a>
          <a routerLink="/boutique" [queryParams]="{ filtre: 'nouveautes' }">Nouveautés</a>
          <a routerLink="/boutique" [queryParams]="{ filtre: 'meilleures-ventes' }">Meilleures ventes</a>
          <a routerLink="/boutique" class="dore">Toute la boutique →</a>
        </nav>
        <nav aria-labelledby="pied-aide">
          <h2 id="pied-aide">Liens utiles</h2>
          <a routerLink="/panier">Panier</a>
          <a routerLink="/favoris">Favoris</a>
          <a routerLink="/compte/commandes">Suivi de commande</a>
          <a routerLink="/aide">FAQ</a>
          <a routerLink="/contact">Contact</a>
        </nav>
        <div>
          <h2>Paiements</h2>
          <ul class="etiquettes">
            @for (moyen of moyens; track moyen) {
              <li>{{ moyen }}</li>
            }
          </ul>
        </div>
      </div>
      <div class="legal">
        <div class="lce-conteneur legal-ligne">
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
      background: var(--lce-navy);
      color: #a9afb6;
      font-size: 13px;
      line-height: 18px;
    }
    .colonnes {
      display: grid;
      grid-template-columns: minmax(240px, 1.4fr) repeat(2, minmax(140px, 1fr)) minmax(220px, 1.2fr);
      gap: 32px;
      padding-block: 40px;
    }
    .marque {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      color: var(--lce-on-navy);
      font: 900 18px/24px var(--lce-police-titre);
      text-decoration: none;
    }
    .marque img {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    address {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-style: normal;
    }
    .discret {
      margin-top: 6px;
    }
    a {
      color: inherit;
      text-decoration: none;
      transition: color 150ms;
    }
    a:hover {
      color: var(--lce-on-navy);
    }
    .fort {
      color: var(--lce-on-navy);
    }
    h2 {
      margin: 0 0 12px;
      color: var(--lce-on-navy);
      font: 500 14px/20px var(--lce-police-texte);
      text-transform: uppercase;
    }
    nav[aria-labelledby] {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .dore {
      color: var(--lce-gold-bright);
    }
    .etiquettes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .etiquettes li {
      padding: 4px 10px;
      border: 1px solid rgb(255 255 255 / 20%);
      border-radius: 2px;
      color: var(--lce-on-navy);
      font-size: 12px;
      line-height: 16px;
    }
    .legal {
      border-top: 1px solid rgb(255 255 255 / 10%);
    }
    .legal-ligne {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px 24px;
      padding-block: 16px;
    }
    .legal nav {
      display: flex;
      gap: 24px;
    }
    @media (max-width: 860px) {
      .colonnes {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .contact {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class PiedDePage {
  readonly coordonnees = input.required<Coordonnees>();
  protected readonly moyens = ['Orange Money', 'Moov Money', 'Visa', 'Mastercard', 'Espèces'];
  protected readonly annee = new Date().getFullYear();
}
