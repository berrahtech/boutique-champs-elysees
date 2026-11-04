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
    rubriques: [
      { libelle: 'Utilisateurs et rôles', lien: '/admin/roles', icone: 'roles', permission: 'role.gerer' },
    ],
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
    <nav aria-label="Administration">
      <a routerLink="/admin" class="logo" aria-label="Les Champs Élysées, administration">
        <img [src]="logoUrl()" alt="" width="40" height="40" />
        <span>Les Champs Élysées<small>Administration</small></span>
      </a>
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
    @use 'typographie' as t;

    :host {
      display: block;
      height: 100%;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    nav {
      padding: var(--lce-espace-5) var(--lce-espace-3);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 var(--lce-espace-3) var(--lce-espace-5);
      color: var(--lce-on-navy);
      text-decoration: none;
      font: 600 16px/20px var(--lce-police-titre);
    }
    .logo img {
      object-fit: contain;
    }
    .logo small {
      display: block;
      font: 600 10px/14px var(--lce-police-texte);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--lce-gold-bright);
    }
    h2 {
      @include t.texte-surtitre;
      margin: var(--lce-espace-4) var(--lce-espace-3) var(--lce-espace-2);
      color: var(--lce-gold-bright);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a {
      @include t.texte-label;
      display: flex;
      align-items: center;
      gap: var(--lce-espace-3);
      min-height: 40px;
      padding-inline: var(--lce-espace-3);
      border-radius: var(--lce-rayon-controle);
      color: var(--lce-on-navy);
      text-decoration: none;
    }
    a:hover {
      background: var(--lce-navy-700);
    }
    a.actif {
      background: var(--lce-navy-500);
    }
    .libelle {
      flex: 1;
    }
    .pastille {
      min-width: 22px;
      padding: 0 6px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      font-size: 12px;
      font-weight: 700;
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
