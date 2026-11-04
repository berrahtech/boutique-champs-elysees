import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';
import { NomIcone } from '../icone/icones';

export interface RubriqueClient {
  libelle: string;
  lien: string;
  icone: NomIcone;
  compteur?: number;
}

/**
 * Rubriques par défaut de l'espace client. Liste à confronter aux 10 rubriques
 * de la maquette « MenuClient » (§ 8 du dossier UX).
 */
export const RUBRIQUES_CLIENT: RubriqueClient[] = [
  { libelle: 'Tableau de bord', lien: '/compte', icone: 'tableau-de-bord' },
  { libelle: 'Mes commandes', lien: '/compte/commandes', icone: 'commandes' },
  { libelle: 'Suivi de livraison', lien: '/compte/suivi', icone: 'livraison' },
  { libelle: 'Mes favoris', lien: '/favoris', icone: 'favoris' },
  { libelle: 'Mes adresses', lien: '/compte/adresses', icone: 'adresse' },
  { libelle: 'Informations personnelles', lien: '/compte/profil', icone: 'profil' },
  { libelle: 'Moyens de paiement', lien: '/compte/paiement', icone: 'caisse' },
  { libelle: 'Notifications', lien: '/compte/notifications', icone: 'notification' },
  { libelle: 'Sécurité', lien: '/compte/securite', icone: 'securite' },
  { libelle: 'Aide', lien: '/aide', icone: 'aide' },
];

/** Menu de l'espace client : rubriques, pastille de compteur, déconnexion. */
@Component({
  selector: 'lce-menu-client',
  imports: [RouterLink, RouterLinkActive, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Mon espace client">
      <ul>
        @for (rubrique of rubriques(); track rubrique.lien) {
          <li>
            <a
              [routerLink]="rubrique.lien"
              routerLinkActive="actif"
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: rubrique.lien === '/compte' }"
            >
              <lce-icone [nom]="rubrique.icone" [taille]="20" />
              <span class="libelle">{{ rubrique.libelle }}</span>
              @if (rubrique.compteur) {
                <span class="compteur">{{ rubrique.compteur }}</span>
              }
            </a>
          </li>
        }
      </ul>
      <button type="button" class="deconnexion" (click)="deconnecter.emit()">
        <lce-icone nom="deconnexion" [taille]="20" />
        Se déconnecter
      </button>
    </nav>
  `,
  styles: `
    @use 'typographie' as t;

    nav {
      padding: var(--lce-espace-3);
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-carte);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a,
    .deconnexion {
      @include t.texte-label;
      display: flex;
      align-items: center;
      gap: var(--lce-espace-3);
      width: 100%;
      min-height: var(--lce-cible-tactile);
      padding-inline: var(--lce-espace-3);
      border: 0;
      border-radius: var(--lce-rayon-controle);
      background: none;
      color: var(--lce-ink);
      text-decoration: none;
      cursor: pointer;
    }
    a:hover {
      background: var(--lce-surface-douce);
    }
    a.actif {
      background: var(--lce-primaire-soft);
      color: var(--lce-navy);
    }
    .libelle {
      flex: 1;
    }
    .compteur {
      min-width: 22px;
      padding: 0 6px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      font-size: 12px;
      text-align: center;
    }
    .deconnexion {
      margin-top: var(--lce-espace-2);
      border-top: 1px solid var(--lce-line);
      border-radius: 0;
      color: var(--lce-danger);
    }
  `,
})
export class MenuClient {
  readonly rubriques = input<RubriqueClient[]>(RUBRIQUES_CLIENT);
  readonly deconnecter = output<void>();
}
