import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Coordonnees {
  telephone: string;
  email: string;
  adresse: string;
  horaires: string;
}

/** Pied de page : liens, coordonnées, moyens de paiement en texte, liens légaux. */
@Component({
  selector: 'lce-pied-de-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <div class="lce-conteneur colonnes">
        <section>
          <h2>Boutique</h2>
          <ul>
            <li><a routerLink="/boutique">Tous les produits</a></li>
            <li><a routerLink="/promotions">Promotions</a></li>
            <li><a routerLink="/compte/commandes">Suivre ma commande</a></li>
          </ul>
        </section>
        <section>
          <h2>Aide</h2>
          <ul>
            <li><a routerLink="/aide">Questions fréquentes</a></li>
            <li><a routerLink="/contact">Nous contacter</a></li>
          </ul>
        </section>
        <section>
          <h2>Nous joindre</h2>
          <address>
            <a [href]="'tel:' + coordonnees().telephone">{{ coordonnees().telephone }}</a><br />
            <a [href]="'mailto:' + coordonnees().email">{{ coordonnees().email }}</a><br />
            {{ coordonnees().adresse }}<br />
            {{ coordonnees().horaires }}
          </address>
        </section>
        <section>
          <h2>Paiement</h2>
          <p>Orange Money · Moov Money · Carte Visa / Mastercard · Paiement à la livraison</p>
        </section>
      </div>
      <div class="lce-conteneur legal">
        <p>© {{ annee }} Les Champs Élysées</p>
        <nav aria-label="Informations légales">
          <a routerLink="/mentions-legales">Mentions légales</a>
          <a routerLink="/confidentialite">Politique de confidentialité</a>
        </nav>
      </div>
    </footer>
  `,
  styles: `
    @use 'typographie' as t;

    footer {
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      padding-block: var(--lce-espace-7) var(--lce-espace-5);
    }
    .colonnes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--lce-espace-6);
    }
    h2 {
      @include t.texte-surtitre;
      margin: 0 0 var(--lce-espace-3);
      color: var(--lce-gold-bright);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: var(--lce-espace-2);
    }
    a {
      color: inherit;
    }
    address,
    p {
      @include t.texte-small;
      font-style: normal;
      margin: 0;
    }
    .legal {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--lce-espace-3);
      margin-top: var(--lce-espace-6);
      padding-top: var(--lce-espace-4);
      border-top: 1px solid var(--lce-navy-500);
    }
    .legal nav {
      @include t.texte-small;
      display: flex;
      gap: var(--lce-espace-4);
    }
  `,
})
export class PiedDePage {
  readonly coordonnees = input.required<Coordonnees>();
  protected readonly annee = new Date().getFullYear();
}
