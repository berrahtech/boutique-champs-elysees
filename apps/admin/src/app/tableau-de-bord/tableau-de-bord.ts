import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Session } from '@lce/session';
import { Icone } from '@lce/ui';
import { EtatStocks } from '../etat-stocks';

/**
 * Tableau de bord : seulement des chiffres réels. Les ventes et les commandes
 * arriveront avec le module commande.
 */
@Component({
  selector: 'lce-tableau-de-bord',
  imports: [RouterLink, Icone],
  template: `
    <div class="adm-corps">
      <div class="adm-titre">
        <div class="empile">
          <h1>Bonjour {{ session.prenom() }}</h1>
          <span class="attenue petit">Rôle : {{ session.profil()?.role }}</span>
        </div>
      </div>

      @if (indicateurs(); as i) {
        <div class="indicateurs">
          <div class="indicateur"><span class="l">Produits au catalogue</span><span class="v">{{ i.produits }}</span></div>
          <div class="indicateur"><span class="l">En rupture</span><span class="v rouge">{{ i.ruptures }}</span><span class="d">affichés « Rupture » sur le site</span></div>
          <div class="indicateur"><span class="l">Sous le seuil d'alerte</span><span class="v or">{{ i.sousSeuil }}</span><span class="d">à réapprovisionner</span></div>
        </div>
      }

      <div class="raccourcis">
        @if (session.permissions().has('produit.voir')) {
          <a class="carte raccourci" routerLink="/admin/produits"><lce-icone nom="produits" [taille]="28" /><b>Produits</b><span class="petit attenue">Fiches, prix, photos, publication</span></a>
        }
        @if (session.permissions().has('stock.ajuster')) {
          <a class="carte raccourci" routerLink="/admin/stocks"><lce-icone nom="stock" [taille]="28" /><b>Stocks et alertes</b><span class="petit attenue">Réceptions, inventaires, mouvements</span></a>
        }
      </div>
      <p class="attenue petit">Les ventes et les commandes s'afficheront ici avec le module commande.</p>
    </div>
  `,
  styles: `
    .raccourcis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .raccourci {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--lce-ink);
      text-decoration: none;
    }
    .raccourci:hover {
      border-color: var(--lce-gold);
    }
    .raccourci lce-icone {
      color: var(--lce-gold-deep);
    }
    p {
      margin: 0;
    }
  `,
})
export class TableauDeBord {
  protected readonly session = inject(Session);
  private readonly stocks = inject(EtatStocks);
  protected readonly indicateurs = computed(() => this.stocks.vue()?.indicateurs);
}
