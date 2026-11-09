import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';
import { NomIcone } from '../icone/icones';

export interface RubriqueAdmin {
  libelle: string;
  lien: string;
  icone: NomIcone;
  /** Permission requise ; sans elle la rubrique n'est pas affichée. */
  permission: string;
  /** Pastille : or = à traiter, rouge = alerte. */
  pastille?: { nombre: number; niveau: 'a-traiter' | 'alerte' };
}

export interface SectionAdmin {
  titre: string;
  rubriques: RubriqueAdmin[];
}

/** Les 5 sections de l'administration, alignées sur les écrans A-* et les permissions du schéma. */
export const SECTIONS_ADMIN: SectionAdmin[] = [
  {
    titre: 'Pilotage',
    rubriques: [
      { libelle: 'Tableau de bord', lien: '/admin', icone: 'tableau-de-bord', permission: 'tableau.voir' },
      { libelle: 'Finances', lien: '/admin/finances', icone: 'finances', permission: 'rapport.voir' },
    ],
  },
  {
    titre: 'Ventes',
    rubriques: [
      { libelle: 'Commandes', lien: '/admin/commandes', icone: 'commandes', permission: 'commande.voir' },
      { libelle: 'Clients', lien: '/admin/clients', icone: 'clients', permission: 'client.voir' },
      { libelle: 'Marketing', lien: '/admin/marketing', icone: 'marketing', permission: 'promo.gerer' },
    ],
  },
  {
    titre: 'Catalogue',
    rubriques: [
      { libelle: 'Produits', lien: '/admin/produits', icone: 'produits', permission: 'produit.voir' },
      { libelle: 'Stocks et alertes', lien: '/admin/stocks', icone: 'stock', permission: 'stock.ajuster' },
    ],
  },
  {
    titre: 'Livraison',
    rubriques: [
      { libelle: 'Livreurs et encaissements', lien: '/admin/livreurs', icone: 'livraison', permission: 'livreur.gerer' },
      { libelle: 'Zones et tarifs', lien: '/admin/zones', icone: 'zones', permission: 'zone.gerer' },
    ],
  },
  {
    titre: 'Administration',
    rubriques: [{ libelle: 'Utilisateurs et rôles', lien: '/admin/roles', icone: 'roles', permission: 'role.gerer' }],
  },
];

/**
 * Menu latéral de l'administration : 5 sections, pastilles, et seulement les
 * rubriques permises par le rôle. Le serveur reste juge : masquer un lien ne
 * protège rien, chaque route API vérifie la permission.
 */
@Component({
  selector: 'lce-menu-admin',
  imports: [RouterLink, RouterLinkActive, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin" class="logo" aria-label="Les Champs Élysées, administration">
      <img [src]="logoUrl()" alt="" width="40" height="40" />
      <span>Les Champs Élysées<small>Administration</small></span>
    </a>
    <nav aria-label="Administration">
      @for (section of sectionsVisibles(); track section.titre) {
        <h2>{{ section.titre }}</h2>
        <ul>
          @for (rubrique of section.rubriques; track rubrique.lien) {
            <li>
              <a
                [routerLink]="rubrique.lien"
                routerLinkActive="actif"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: rubrique.lien === '/admin' }"
              >
                <lce-icone [nom]="rubrique.icone" [taille]="20" />
                <span class="libelle">{{ rubrique.libelle }}</span>
                @if (rubrique.pastille; as pastille) {
                  @if (pastille.nombre > 0) {
                    <span class="pastille" [class.alerte]="pastille.niveau === 'alerte'">
                      {{ pastille.nombre }}
                      <span class="lce-visuellement-masque">
                        {{ pastille.niveau === 'alerte' ? 'en alerte' : 'à traiter' }}
                      </span>
                    </span>
                  }
                }
              </a>
            </li>
          }
        </ul>
      }
    </nav>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 14px;
      padding: 22px 10px 20px;
      border-bottom: 1px solid rgb(255 255 255 / 8%);
      color: var(--lce-on-navy);
      font: 800 16px/20px var(--lce-police-titre);
      text-decoration: none;
    }
    .logo img {
      object-fit: contain;
    }
    .logo small {
      display: block;
      margin-top: 2px;
      color: var(--lce-gold);
      font: 700 10px/14px var(--lce-police-texte);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    nav {
      flex: 1;
      overflow-y: auto;
      padding: 8px 14px 28px;
      scrollbar-width: thin;
      scrollbar-color: rgb(255 255 255 / 18%) transparent;
    }
    h2 {
      margin: 22px 12px 8px;
      color: rgb(255 255 255 / 42%);
      font: 700 11px/16px var(--lce-police-texte);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    ul {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a:not(.logo) {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 42px;
      padding-inline: 12px;
      border-radius: 10px;
      color: rgb(255 255 255 / 74%);
      font: 500 14px/20px var(--lce-police-texte);
      text-decoration: none;
      transition:
        background-color 150ms,
        color 150ms;
    }
    a:not(.logo) lce-icone {
      color: rgb(255 255 255 / 55%);
      transition: color 150ms;
    }
    a:not(.logo):hover {
      background: rgb(255 255 255 / 6%);
      color: var(--lce-on-navy);
    }
    a.actif {
      background: rgb(255 255 255 / 10%);
      color: var(--lce-on-navy);
      font-weight: 700;
    }
    a.actif lce-icone {
      color: var(--lce-gold);
    }
    // Repère doré contre le bord, comme l'onglet actif de la boutique.
    a.actif::before {
      content: '';
      position: absolute;
      top: 10px;
      bottom: 10px;
      left: -14px;
      width: 4px;
      border-radius: 0 4px 4px 0;
      background: var(--lce-gold);
    }
    .libelle {
      flex: 1;
    }
    .pastille {
      min-width: 22px;
      padding: 0 7px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      font: 800 11px/20px var(--lce-police-texte);
      text-align: center;
    }
    .pastille.alerte {
      background: var(--lce-danger);
      color: var(--lce-on-navy);
    }
  `,
})
export class MenuAdmin {
  readonly sections = input<SectionAdmin[]>(SECTIONS_ADMIN);
  readonly permissions = input.required<ReadonlySet<string>>();
  readonly logoUrl = input('/logo-lce.png');

  protected readonly sectionsVisibles = computed(() =>
    this.sections()
      .map((s) => ({ ...s, rubriques: s.rubriques.filter((r) => this.permissions().has(r.permission)) }))
      .filter((s) => s.rubriques.length > 0),
  );
}
