import { Component } from '@angular/core';
import { FcfaPipe, PastilleStatut, STATUTS_COMMANDE } from '@lce/ui';

/** Tableau de bord provisoire (lot 0) : vérifie la mise en page de l'administration. */
@Component({
  selector: 'lce-tableau-de-bord',
  imports: [FcfaPipe, PastilleStatut],
  template: `
    <h1>Tableau de bord</h1>
    <div class="indicateurs">
      <article>
        <p>Ventes du jour</p>
        <strong>{{ 1284500 | fcfa }}</strong>
      </article>
      <article>
        <p>Commandes à traiter</p>
        <strong>12</strong>
      </article>
      <article>
        <p>Produits en alerte de stock</p>
        <strong>3</strong>
      </article>
    </div>
    <h2>Dernières commandes</h2>
    <table>
      <thead>
        <tr><th scope="col">Commande</th><th scope="col">Statut</th><th scope="col" class="montant">Total</th></tr>
      </thead>
      <tbody>
        <tr><td>LCE-2026-000124</td><td><lce-pastille-statut [statut]="statuts.EN_ATTENTE_AFFECTATION" /></td><td class="montant">{{ 41900 | fcfa }}</td></tr>
        <tr><td>LCE-2026-000123</td><td><lce-pastille-statut [statut]="statuts.EN_COURS_LIVRAISON" /></td><td class="montant">{{ 153600 | fcfa }}</td></tr>
        <tr><td>LCE-2026-000122</td><td><lce-pastille-statut [statut]="statuts.LIVREE" /></td><td class="montant">{{ 8500 | fcfa }}</td></tr>
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--lce-espace-5);
    }
    .indicateurs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--lce-espace-4);
    }
    article,
    table {
      background: var(--lce-surface);
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-carte-mobile);
    }
    article {
      padding: var(--lce-espace-5);
    }
    article p {
      margin: 0 0 var(--lce-espace-2);
      color: var(--lce-ink-muted);
    }
    strong {
      font-size: 24px;
      font-variant-numeric: tabular-nums;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }
    th,
    td {
      padding: var(--lce-espace-3) var(--lce-espace-4);
      text-align: left;
      border-bottom: 1px solid var(--lce-line);
    }
    tr:last-child td {
      border-bottom: 0;
    }
    .montant {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class TableauDeBord {
  protected readonly statuts = STATUTS_COMMANDE;
}
