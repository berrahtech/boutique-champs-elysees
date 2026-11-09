import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ListeCommandesAdmin, StatutCommande } from '@lce/contrats';
import { API } from '@lce/session';
import { FcfaPipe, Icone, PastilleStatut, STATUTS_COMMANDE } from '@lce/ui';

type Filtre = StatutCommande | 'a-traiter' | '';

const ONGLETS: { id: Filtre; libelle: string }[] = [
  { id: 'a-traiter', libelle: 'À traiter' },
  { id: 'CONFIRMEE', libelle: 'Nouvelles' },
  { id: 'EN_PREPARATION', libelle: 'En préparation' },
  { id: 'EN_ATTENTE_AFFECTATION', libelle: 'À affecter' },
  { id: 'AFFECTEE', libelle: 'Affectées' },
  { id: 'EN_COURS_LIVRAISON', libelle: 'En livraison' },
  { id: 'LIVREE', libelle: 'Livrées' },
  { id: 'ECHEC_LIVRAISON', libelle: 'Échecs' },
  { id: 'ANNULEE', libelle: 'Annulées' },
  { id: '', libelle: 'Toutes' },
];
const A_TRAITER: StatutCommande[] = ['CONFIRMEE', 'EN_PREPARATION', 'EN_ATTENTE_AFFECTATION', 'ECHEC_LIVRAISON'];

/** Liste des commandes (maquette « A-Commandes »). */
@Component({
  selector: 'lce-commandes',
  imports: [DatePipe, FormsModule, RouterLink, FcfaPipe, Icone, PastilleStatut],
  template: `
    <div class="adm-corps">
      <div class="adm-titre">
        <div class="empile">
          <h1>Commandes</h1>
          <span class="attenue petit">{{ liste()?.total ?? '…' }} commande(s) dans cette vue</span>
        </div>
        <div class="champ-recherche recherche">
          <lce-icone nom="recherche" [taille]="18" />
          <input aria-label="Rechercher une commande" placeholder="N°, nom ou téléphone du client" [(ngModel)]="saisie" (ngModelChange)="rechercher($event)" />
        </div>
      </div>

      <div class="defilant">
        <div class="onglets" role="tablist" aria-label="Statut">
          @for (o of onglets; track o.id) {
            <button type="button" role="tab" class="onglet" [class.on]="filtre() === o.id" [attr.aria-selected]="filtre() === o.id" (click)="changerFiltre(o.id)">
              {{ o.libelle }}
              @if (compte(o.id); as n) {
                <span>{{ n }}</span>
              }
            </button>
          }
        </div>
      </div>

      <div class="tableau-cadre" [attr.aria-busy]="ressource.isLoading() && !!liste()">
        <table class="tableau">
          <thead>
            <tr>
              <th scope="col">Commande</th>
              <th scope="col">Client</th>
              <th scope="col">Zone</th>
              <th scope="col">Livreur</th>
              <th scope="col" class="a-droite">Total</th>
              <th scope="col">Statut</th>
              <th scope="col"><span class="lce-visuellement-masque">Ouvrir</span></th>
            </tr>
          </thead>
          <tbody>
            @if (liste(); as l) {
              @for (c of l.commandes; track c.id) {
                <tr class="cliquable" (click)="ouvrir(c.id)">
                  <td>
                    <span class="empile">
                      <a class="numero" [routerLink]="['/admin/commandes', c.id]" (click)="$event.stopPropagation()">{{ c.numero }}</a>
                      <small class="attenue">{{ c.creeLe | date: 'd MMM, HH:mm' }} · {{ c.nbArticles }} art.</small>
                    </span>
                  </td>
                  <td><span class="empile"><b>{{ c.client.nom }}</b><small class="attenue chiffres">{{ c.client.telephone ?? '' }}</small></span></td>
                  <td class="petit">{{ c.zone }}</td>
                  <td class="petit">{{ c.livreur ?? '—' }}</td>
                  <td class="a-droite chiffres"><b>{{ c.total | fcfa }}</b></td>
                  <td><lce-pastille-statut [statut]="statuts[c.statut]" /></td>
                  <td class="a-droite"><lce-icone nom="chevron-droite" [taille]="18" class="attenue" /></td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7">
                    <div class="aucun">
                      <span class="icone-teinte vert"><lce-icone nom="valide-rond" [taille]="22" /></span>
                      <b>{{ filtre() === 'a-traiter' ? 'Tout est traité' : 'Aucune commande' }}</b>
                      <span class="petit attenue">{{ filtre() === 'a-traiter' ? 'Les nouvelles commandes apparaîtront ici.' : 'Rien dans cette vue pour l’instant.' }}</span>
                    </div>
                  </td>
                </tr>
              }
            } @else {
              @for (n of [1, 2, 3, 4, 5]; track n) {
                <tr>
                  <td colspan="7"><span class="squelette" style="height: 32px"></span></td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (liste(); as l) {
        @if (l.pages > 1) {
          <div class="pagination petit">
            <button type="button" [disabled]="l.page <= 1" aria-label="Page précédente" (click)="page.set(l.page - 1)"><lce-icone nom="chevron-gauche" [taille]="18" /></button>
            <span class="chiffres">Page <b>{{ l.page }}</b> sur {{ l.pages }}</span>
            <button type="button" [disabled]="l.page >= l.pages" aria-label="Page suivante" (click)="page.set(l.page + 1)"><lce-icone nom="chevron-droite" [taille]="18" /></button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .recherche {
      flex: 0 1 360px;
    }
    .defilant {
      overflow-x: auto;
      scrollbar-width: none;
    }
    .onglets {
      flex-wrap: nowrap;
    }
    .onglet {
      white-space: nowrap;
    }
    .tableau {
      min-width: 860px;
    }
    .cliquable {
      cursor: pointer;
    }
    .numero {
      color: var(--lce-ink);
      font: 800 14px/20px var(--lce-police-texte);
      text-decoration: none;
    }
    .numero:hover {
      color: var(--lce-navy-500);
    }
    small {
      font-size: 12px;
      line-height: 16px;
    }
    .aucun {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 44px 16px;
      text-align: center;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
    }
    .pagination button {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--adm-ligne);
      border-radius: 10px;
      background: var(--lce-surface);
      cursor: pointer;
    }
    .pagination button:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
})
export class Commandes {
  private readonly router = inject(Router);

  /** Filtre venu de l'URL (?statut=), par exemple depuis le tableau de bord. */
  readonly statut = input<string>();

  protected readonly onglets = ONGLETS;
  protected readonly statuts = STATUTS_COMMANDE;
  protected readonly filtre = signal<Filtre>('a-traiter');
  protected readonly requete = signal('');
  protected readonly page = signal(1);
  protected saisie = '';
  private minuteur?: ReturnType<typeof setTimeout>;

  protected readonly ressource = httpResource<ListeCommandesAdmin>(() => {
    const params: Record<string, string | number> = { page: this.page() };
    if (this.filtre()) params['statut'] = this.filtre();
    if (this.requete()) params['q'] = this.requete();
    return { url: `${API}/admin/commandes`, params };
  });
  protected readonly liste = linkedSignal<ListeCommandesAdmin | undefined, ListeCommandesAdmin | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });
  private readonly compteurs = computed(() => this.liste()?.compteurs ?? {});

  constructor() {
    effect(() => {
      const s = this.statut();
      if (s !== undefined) this.filtre.set(s as Filtre);
    });
  }

  protected compte(id: Filtre): number {
    const c = this.compteurs();
    if (id === '') return 0;
    if (id === 'a-traiter') return A_TRAITER.reduce((n, s) => n + (c[s] ?? 0), 0);
    return c[id] ?? 0;
  }

  protected changerFiltre(id: Filtre): void {
    this.filtre.set(id);
    this.page.set(1);
  }

  protected rechercher(valeur: string): void {
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => {
      this.requete.set(valeur.trim());
      this.page.set(1);
    }, 300);
  }

  protected ouvrir(id: string): void {
    void this.router.navigate(['/admin/commandes', id]);
  }
}
