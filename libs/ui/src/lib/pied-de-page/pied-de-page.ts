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
          <div class="presentation">
            <a routerLink="/" class="marque" aria-label="Les Champs Élysées, accueil">
              <img src="/logo-lce.png" alt="" width="64" height="64" />
              <span>Les Champs Élysées</span>
            </a>
            <p>Mode, beauté, maison, électroménager et high-tech : tout votre shopping au même endroit, livré chez vous par nos équipes.</p>
          </div>
          <nav aria-labelledby="pied-boutique">
            <h2 id="pied-boutique">Boutique</h2>
            <a routerLink="/boutique">Toute la boutique</a>
            <a routerLink="/promotions">Promotions</a>
            <a routerLink="/boutique" [queryParams]="{ filtre: 'nouveautes' }">Nouveautés</a>
            <a routerLink="/favoris">Mes favoris</a>
          </nav>
          <nav aria-labelledby="pied-aide">
            <h2 id="pied-aide">Aide</h2>
            <a routerLink="/compte/commandes">Suivre ma commande</a>
            <a routerLink="/aide">Questions fréquentes</a>
            <a routerLink="/contact">Nous contacter</a>
            <a routerLink="/compte">Mon compte</a>
          </nav>
          <div>
            <h2>Nous joindre</h2>
            <address>
              <span><lce-icone nom="telephone" [taille]="18" /><a [href]="'tel:' + coordonnees().telephone.replace(/\\s/g, '')">{{ coordonnees().telephone }}</a></span>
              <span><lce-icone nom="email" [taille]="18" /><a [href]="'mailto:' + coordonnees().email">{{ coordonnees().email }}</a></span>
              <span><lce-icone nom="localisation" [taille]="18" />{{ coordonnees().adresse }}</span>
              <span><lce-icone nom="horloge" [taille]="18" />{{ coordonnees().horaires }}</span>
            </address>
          </div>
        </div>

        <div class="paiements">
          <span class="titre">Paiements acceptés</span>
          @for (moyen of moyens; track moyen) {
            <span class="moyen">{{ moyen }}</span>
          }
        </div>

        <div class="legal">
          <span>© {{ annee }} Les Champs Élysées · Bamako, Mali</span>
          <nav aria-label="Informations légales">
            <a routerLink="/mentions-legales">Mentions légales</a>
            <a routerLink="/confidentialite">Politique de confidentialité</a>
          </nav>
        </div>
      </div>
    </footer>
  `,
  styles: `
    footer {
      background: var(--lce-navy);
      color: #c9d0e0;
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
    .presentation {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .marque {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--lce-on-navy);
      text-decoration: none;
      font: 600 20px/26px var(--lce-police-titre);
    }
    .marque img {
      width: 64px;
      height: 64px;
      object-fit: contain;
    }
    p {
      margin: 0;
      font-size: 14px;
      line-height: 22px;
    }
    nav[aria-labelledby] {
      display: flex;
      flex-direction: column;
    }
    h2,
    .titre {
      margin: 0 0 12px;
      font: 600 12px/16px var(--lce-police-texte);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--lce-gold-bright);
    }
    a {
      color: #c9d0e0;
      text-decoration: none;
      font-size: 14px;
      line-height: 30px;
    }
    a:hover {
      color: var(--lce-gold-bright);
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
      border: 1px solid #2a3b66;
      border-radius: 6px;
      font: 600 12px/16px var(--lce-police-texte);
      color: #e8ebf3;
    }
    .legal {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px 24px;
      padding-top: 24px;
      border-top: 1px solid #24345c;
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
  protected readonly moyens = ['Orange Money', 'Moov Money', 'Visa', 'Mastercard', 'Paiement à la livraison'];
  protected readonly annee = new Date().getFullYear();
}
