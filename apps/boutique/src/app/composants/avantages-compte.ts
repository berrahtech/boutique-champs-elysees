import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FcfaPipe, Icone } from '@lce/ui';
import { Panier } from '../etat/panier';

/** Panneau bleu nuit des pages Connexion et Inscription : rappel du panier et avantages du compte. */
@Component({
  selector: 'lce-avantages-compte',
  imports: [FcfaPipe, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="surtitre">{{ surtitre() }}</span>
    <h1 class="titre-1">{{ titre() }}</h1>
    <p>{{ texte() }}</p>
    @if (!panier.estVide()) {
      <div class="resume">
        <div class="ligne-montant"><span>Votre panier</span><span>{{ panier.nbArticles() }} article{{ panier.nbArticles() > 1 ? 's' : '' }}</span></div>
        <div class="ligne-montant"><span>Sous-total</span><b>{{ panier.apercu()?.sousTotal ?? 0 | fcfa }}</b></div>
      </div>
    }
    <ul>
      <li><lce-icone nom="livraison" [taille]="22" />Suivi de votre livraison en temps réel</li>
      <li><lce-icone nom="panier" [taille]="22" />Panier synchronisé entre le site et l'application</li>
      <li><lce-icone nom="favoris" [taille]="22" />Favoris et historique de vos commandes</li>
    </ul>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 40px;
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .surtitre {
      color: var(--lce-on-navy);
    }
    .titre-1 {
      color: var(--lce-on-navy);
    }
    p {
      margin: 0;
      color: #d5dae6;
    }
    .resume {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border-radius: var(--lce-rayon-controle);
      background: var(--lce-navy-700);
      color: #c9d0e0;

      b {
        font-size: 20px;
        color: var(--lce-on-navy);
      }
    }
    ul {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    lce-icone {
      flex: none;
      color: var(--lce-on-navy);
    }
    @media (max-width: 520px) {
      :host {
        padding: 24px;
      }
    }
  `,
})
export class AvantagesCompte {
  protected readonly panier = inject(Panier);
  readonly surtitre = input.required<string>();
  readonly titre = input.required<string>();
  readonly texte = input.required<string>();
}
