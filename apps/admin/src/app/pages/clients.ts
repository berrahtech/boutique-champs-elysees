import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ClientAdminDetail, ListeClientsAdmin } from '@lce/contrats';
import { API, Session } from '@lce/session';
import { Bouton, FcfaPipe, Icone, PastilleStatut, STATUTS_COMMANDE } from '@lce/ui';
import { envoyer, initiales } from '../outils';

/** Clients : liste, puis fiche avec commandes et adresses (maquette « A-Clients »). */
@Component({
  selector: 'lce-clients',
  imports: [DatePipe, FormsModule, RouterLink, Bouton, FcfaPipe, Icone, PastilleStatut],
  template: `
    <div class="adm-corps">
      @if (id()) {
        @if (fiche(); as c) {
          <div class="adm-titre">
            <div class="titre-fiche">
              <a class="retour" routerLink="/admin/clients" aria-label="Retour aux clients"><lce-icone nom="chevron-gauche" [taille]="20" /></a>
              <span class="avatar grand" aria-hidden="true">{{ ini(c.nom) }}</span>
              <div class="empile">
                <h1>{{ c.nom }}</h1>
                <span class="petit attenue">Client depuis le {{ c.creeLe | date: 'd MMMM yyyy' }}</span>
              </div>
            </div>
            @if (peutGerer()) {
              <button lceBouton variante="clair" type="button" [class.danger]="c.actif" [disabled]="envoi()" (click)="basculer(c)">
                {{ c.actif ? 'Désactiver le compte' : 'Réactiver le compte' }}
              </button>
            }
          </div>
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
          @if (!c.actif) {
            <p class="erreur"><lce-icone nom="cadenas" [taille]="18" />Ce compte est désactivé : le client ne peut plus se connecter.</p>
          }

          <div class="indicateurs">
            <div class="indicateur"><span class="icone-teinte"><lce-icone nom="commandes" [taille]="22" /></span><span class="l">Commandes</span><span class="v">{{ c.commandes }}</span></div>
            <div class="indicateur"><span class="icone-teinte vert"><lce-icone nom="especes" [taille]="22" /></span><span class="l">Achats livrés</span><span class="v">{{ c.depense | fcfa }}</span></div>
            <div class="indicateur"><span class="icone-teinte or"><lce-icone nom="horloge" [taille]="22" /></span><span class="l">Dernière commande</span><span class="v petit-v">{{ c.derniereCommande ? (c.derniereCommande | date: 'd MMM yyyy') : '—' }}</span></div>
          </div>

          <div class="deux-colonnes">
            <div class="principal">
              <section class="carte">
                <h2>Commandes</h2>
                <ul class="lignes">
                  @for (o of c.historique; track o.id) {
                    <li>
                      <a [routerLink]="['/admin/commandes', o.id]">
                        <span class="empile"><b>{{ o.numero }}</b><small class="attenue">{{ o.creeLe | date: 'd MMM yyyy' }} · {{ o.nbArticles }} article(s)</small></span>
                        <lce-pastille-statut [statut]="statuts[o.statut]" />
                        <b class="chiffres montant">{{ o.total | fcfa }}</b>
                      </a>
                    </li>
                  } @empty {
                    <li class="attenue petit">Aucune commande pour l'instant.</li>
                  }
                </ul>
              </section>
            </div>
            <div class="lateral">
              <section class="carte">
                <h2>Coordonnées</h2>
                <dl>
                  <dt>Téléphone</dt><dd class="chiffres">{{ c.telephone ?? '—' }}</dd>
                  <dt>E-mail</dt><dd>{{ c.email ?? '—' }}</dd>
                </dl>
              </section>
              <section class="carte">
                <h2>Adresses de livraison</h2>
                @for (a of c.adresses; track $index) {
                  <p class="adresse"><b>{{ a.quartier }}</b> · {{ a.zone }}<br /><span class="attenue petit">{{ a.repere }}</span></p>
                } @empty {
                  <p class="petit attenue">Aucune adresse : elle s'enregistre avec la première commande.</p>
                }
              </section>
            </div>
          </div>
        } @else if (ressourceFiche.error()) {
          <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />Client introuvable.</p>
        } @else {
          <span class="squelette" style="height: 400px; border-radius: 16px"></span>
        }
      } @else {
        <div class="adm-titre">
          <div class="empile">
            <h1>Clients</h1>
            <span class="attenue petit">{{ liste()?.total ?? '…' }} compte(s) client</span>
          </div>
          <div class="champ-recherche recherche">
            <lce-icone nom="recherche" [taille]="18" />
            <input aria-label="Rechercher un client" placeholder="Nom, téléphone ou e-mail" [(ngModel)]="saisie" (ngModelChange)="rechercher($event)" />
          </div>
        </div>

        <div class="tableau-cadre" [attr.aria-busy]="ressource.isLoading() && !!liste()">
          <table class="tableau">
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col">Contact</th>
                <th scope="col" class="a-droite">Commandes</th>
                <th scope="col" class="a-droite">Achats livrés</th>
                <th scope="col">Dernière commande</th>
                <th scope="col"><span class="lce-visuellement-masque">Ouvrir</span></th>
              </tr>
            </thead>
            <tbody>
              @if (liste(); as l) {
                @for (c of l.clients; track c.id) {
                  <tr class="cliquable" (click)="ouvrir(c.id)">
                    <td>
                      <span class="produit-cellule">
                        <span class="avatar" aria-hidden="true">{{ ini(c.nom) }}</span>
                        <span class="nom">
                          <a [routerLink]="['/admin/clients', c.id]" (click)="$event.stopPropagation()">{{ c.nom }}</a>
                          <small>{{ c.actif ? 'Inscrit le ' + (c.creeLe | date: 'd MMM yyyy') : 'Compte désactivé' }}</small>
                        </span>
                      </span>
                    </td>
                    <td class="petit"><span class="chiffres">{{ c.telephone ?? '' }}</span><br /><span class="attenue">{{ c.email ?? '' }}</span></td>
                    <td class="a-droite chiffres">{{ c.commandes }}</td>
                    <td class="a-droite chiffres"><b>{{ c.depense | fcfa }}</b></td>
                    <td class="petit">{{ c.derniereCommande ? (c.derniereCommande | date: 'd MMM yyyy') : '—' }}</td>
                    <td class="a-droite"><lce-icone nom="chevron-droite" [taille]="18" class="attenue" /></td>
                  </tr>
                } @empty {
                  <tr><td colspan="6"><div class="aucun"><b>Aucun client</b><span class="petit attenue">Modifiez la recherche.</span></div></td></tr>
                }
              } @else {
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <tr><td colspan="6"><span class="squelette" style="height: 36px"></span></td></tr>
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
      }
    </div>
  `,
  styles: `
    .recherche {
      flex: 0 1 360px;
    }
    .tableau {
      min-width: 760px;
    }
    .cliquable {
      cursor: pointer;
    }
    .avatar {
      display: grid;
      place-items: center;
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--lce-gold-soft);
      color: var(--lce-gold-text);
      font: 800 13px/1 var(--lce-police-texte);
    }
    .avatar.grand {
      width: 56px;
      height: 56px;
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      font-size: 18px;
    }
    .titre-fiche {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .retour {
      display: grid;
      place-items: center;
      flex: none;
      width: 40px;
      height: 40px;
      border: 1px solid var(--adm-ligne);
      border-radius: 12px;
      background: var(--lce-surface);
      color: var(--lce-ink);
    }
    .danger {
      color: var(--lce-danger);
    }
    .petit-v {
      font-size: 18px !important;
    }
    .lignes {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .lignes a {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 8px;
      margin-inline: -8px;
      border-radius: 10px;
      color: var(--lce-ink);
      text-decoration: none;
    }
    .lignes a:hover {
      background: var(--lce-adm-bg);
    }
    .lignes .empile {
      flex: 1;
    }
    .montant {
      min-width: 100px;
      text-align: right;
    }
    small {
      font-size: 12px;
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 10px 20px;
      margin: 0;
    }
    dt {
      color: var(--lce-ink-muted);
    }
    dd {
      margin: 0;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .adresse {
      margin: 0 0 10px;
      line-height: 22px;
    }
    .aucun {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 40px 16px;
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
    }
  `,
})
export class Clients {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(Session);

  /** Présent sur /admin/clients/:id. */
  readonly id = input<string>();

  protected readonly statuts = STATUTS_COMMANDE;
  protected readonly peutGerer = computed(() => this.session.permissions().has('utilisateur.gerer'));
  protected readonly requete = signal('');
  protected readonly page = signal(1);
  protected saisie = '';
  private minuteur?: ReturnType<typeof setTimeout>;

  protected readonly ressource = httpResource<ListeClientsAdmin>(() => {
    if (this.id()) return undefined;
    const params: Record<string, string | number> = { page: this.page() };
    if (this.requete()) params['q'] = this.requete();
    return { url: `${API}/admin/clients`, params };
  });
  protected readonly liste = linkedSignal<ListeClientsAdmin | undefined, ListeClientsAdmin | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });

  protected readonly ressourceFiche = httpResource<ClientAdminDetail>(() => (this.id() ? `${API}/admin/clients/${this.id()}` : undefined));
  protected readonly fiche = linkedSignal<ClientAdminDetail | undefined, ClientAdminDetail | undefined>({
    source: () => (this.ressourceFiche.hasValue() ? this.ressourceFiche.value() : undefined),
    computation: (v) => v,
  });
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal(false);

  protected ini(nom: string): string {
    return initiales(nom);
  }

  protected rechercher(valeur: string): void {
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => {
      this.requete.set(valeur.trim());
      this.page.set(1);
    }, 300);
  }

  protected ouvrir(id: string): void {
    void this.router.navigate(['/admin/clients', id]);
  }

  protected async basculer(c: ClientAdminDetail): Promise<void> {
    if (c.actif && !confirm(`Désactiver le compte de ${c.nom} ? Il ne pourra plus se connecter.`)) return;
    const fiche = await envoyer(this.http.patch<ClientAdminDetail>(`${API}/admin/clients/${c.id}`, { actif: !c.actif }), this.erreur, this.envoi);
    if (fiche) this.fiche.set(fiche);
  }
}
