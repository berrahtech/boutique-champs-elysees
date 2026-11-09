import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ListeProduitsAdmin } from '@lce/contrats';
import { API, Session } from '@lce/session';
import { Bouton, FcfaPipe, Icone, NomIcone, PastilleStatut, STATUTS_COMMANDE } from '@lce/ui';
import { EtatStocks, LIBELLES_MOUVEMENT, signeMouvement } from '../etat-stocks';
import { EtatVentes } from '../etat-ventes';

/**
 * Tableau de bord : seulement des chiffres réels, selon les droits de la personne :
 * ventes du jour, commandes à traiter, état des stocks.
 */
@Component({
  selector: 'lce-tableau-de-bord',
  imports: [DatePipe, RouterLink, Bouton, FcfaPipe, Icone, PastilleStatut],
  template: `
    <div class="adm-corps">
      <section class="accueil">
        <div class="accueil-texte">
          <span class="date">{{ aujourdhui | date: 'EEEE d MMMM' }}</span>
          <h1>Bonjour {{ session.prenom() }}</h1>
          <p>
            @if (aTraiter() > 0) {
              {{ aTraiter() }} commande{{ aTraiter() > 1 ? 's attendent' : ' attend' }} votre action.
            }
            @if (alertes() > 0) {
              {{ alertes() }} article{{ alertes() > 1 ? 's demandent' : ' demande' }} votre attention dans les stocks.
            } @else if (!aTraiter()) {
              Tout est en ordre.
            }
          </p>
          <div class="outils">
            @if (peut('commande.voir') && aTraiter()) {
              <a lceBouton variante="clair" routerLink="/admin/commandes"><lce-icone nom="commandes" [taille]="18" />Traiter les commandes</a>
            }
            @if (peut('produit.modifier')) {
              <a lceBouton variante="clair" routerLink="/admin/produits/nouveau"><lce-icone nom="plus" [taille]="18" />Nouveau produit</a>
            }
            @if (peut('stock.ajuster')) {
              <a lceBouton variante="fantome" routerLink="/admin/stocks">Gérer les stocks</a>
            }
          </div>
        </div>
        <img src="/logo-lce.png" alt="" width="148" height="148" />
      </section>

      @if (peut('commande.voir')) {
        <div class="indicateurs">
          @if (ventes(); as v) {
            <a class="indicateur" routerLink="/admin/commandes">
              <span class="icone-teinte noir"><lce-icone nom="commandes" [taille]="22" /></span>
              <span class="l">À traiter</span><span class="v">{{ v.aTraiter }}</span>
            </a>
            <a class="indicateur" routerLink="/admin/commandes" [queryParams]="{ statut: 'EN_COURS_LIVRAISON' }">
              <span class="icone-teinte"><lce-icone nom="livraison" [taille]="22" /></span>
              <span class="l">En livraison</span><span class="v">{{ v.enLivraison }}</span>
            </a>
            <a class="indicateur" routerLink="/admin/commandes" [queryParams]="{ statut: '' }">
              <span class="icone-teinte vert"><lce-icone nom="panier" [taille]="22" /></span>
              <span class="l">Commandes du jour</span><span class="v">{{ v.commandesDuJour }}</span>
            </a>
            <a class="indicateur" [routerLink]="peut('rapport.voir') ? '/admin/finances' : '/admin/commandes'">
              <span class="icone-teinte or"><lce-icone nom="finances" [taille]="22" /></span>
              <span class="l">Ventes du jour</span><span class="v">{{ v.chiffreDuJour | fcfa }}</span>
            </a>
          } @else {
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="indicateur"><span class="squelette" style="width: 44px; height: 44px; grid-row: span 2"></span><span class="squelette" style="height: 14px; width: 70%"></span><span class="squelette" style="height: 26px; width: 40%"></span></div>
            }
          }
        </div>

        @if (ventes(); as v) {
          <section class="carte">
            <div class="entre tete">
              <h2 class="titre-carte">Dernières commandes</h2>
              <a class="lien" routerLink="/admin/commandes" [queryParams]="{ statut: '' }">Toutes les commandes<lce-icone nom="chevron-droite" [taille]="16" /></a>
            </div>
            <ul class="liste commandes">
              @for (c of v.dernieres; track c.id) {
                <li>
                  <a [routerLink]="['/admin/commandes', c.id]">
                    <span class="nom"><b>{{ c.numero }}</b><small>{{ c.client.nom }} · {{ c.zone }} · {{ c.creeLe | date: 'd MMM, HH:mm' }}</small></span>
                    <lce-pastille-statut [statut]="statuts[c.statut]" />
                    <b class="chiffres montant">{{ c.total | fcfa }}</b>
                  </a>
                </li>
              } @empty {
                <li class="vide">
                  <span class="icone-teinte"><lce-icone nom="panier" [taille]="22" /></span>
                  Aucune commande pour l'instant : elles arrivent ici dès qu'un client valide son panier.
                </li>
              }
            </ul>
          </section>
        }
      }

      @if (peut('stock.ajuster')) {
        <div class="indicateurs">
          @if (indicateurs(); as i) {
            <a class="indicateur" routerLink="/admin/produits">
              <span class="icone-teinte"><lce-icone nom="produits" [taille]="22" /></span>
              <span class="l">Produits au catalogue</span><span class="v">{{ i.produits }}</span>
            </a>
            <a class="indicateur" routerLink="/admin/produits">
              <span class="icone-teinte vert"><lce-icone nom="voir" [taille]="22" /></span>
              <span class="l">En ligne</span><span class="v">{{ publies() ?? '—' }}</span>
            </a>
            <a class="indicateur" routerLink="/admin/stocks">
              <span class="icone-teinte rouge"><lce-icone nom="alerte" [taille]="22" /></span>
              <span class="l">En rupture</span><span class="v rouge">{{ i.ruptures }}</span>
            </a>
            <a class="indicateur" routerLink="/admin/stocks">
              <span class="icone-teinte or"><lce-icone nom="stock" [taille]="22" /></span>
              <span class="l">Sous le seuil</span><span class="v or">{{ i.sousSeuil }}</span>
            </a>
          } @else {
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="indicateur"><span class="squelette" style="width: 44px; height: 44px; grid-row: span 2"></span><span class="squelette" style="height: 14px; width: 70%"></span><span class="squelette" style="height: 26px; width: 40%"></span></div>
            }
          }
        </div>

        <div class="grille">
          <section class="carte">
            <div class="entre tete">
              <h2 class="titre-carte">À réapprovisionner</h2>
              <a class="lien" routerLink="/admin/stocks">Tout voir<lce-icone nom="chevron-droite" [taille]="16" /></a>
            </div>
            @if (vue()) {
              <ul class="liste">
                @for (l of aReapprovisionner(); track l.produitId) {
                  <li>
                    <span class="vignette"><lce-icone [nom]="ico(l.icone)" [taille]="20" /></span>
                    <span class="nom">
                      <a [routerLink]="['/admin/produits', l.produitId]">{{ l.nom }}</a>
                      <span class="jauge" [class.epuise]="l.disponible === 0"><span [style.width.%]="remplissage(l.disponible, l.seuilAlerte)"></span></span>
                    </span>
                    <span class="quantite chiffres"><b>{{ l.disponible }}</b><small> / {{ l.seuilAlerte }}</small></span>
                    <span class="etat" [class]="l.etat">{{ l.etat === 'rupture' ? 'Rupture' : 'Bas' }}</span>
                  </li>
                } @empty {
                  <li class="vide">
                    <span class="icone-teinte vert"><lce-icone nom="valide-rond" [taille]="22" /></span>
                    Aucun article sous son seuil d'alerte.
                  </li>
                }
              </ul>
            } @else {
              <div class="liste">
                @for (n of [1, 2, 3, 4]; track n) {
                  <span class="squelette" style="height: 44px"></span>
                }
              </div>
            }
          </section>

          <section class="carte">
            <div class="entre tete">
              <h2 class="titre-carte">Activité récente</h2>
            </div>
            @if (vue(); as v) {
              <ol class="activite">
                @for (m of mouvements(); track m.id) {
                  <li [class.moins]="signe(m.type, m.quantite) < 0">
                    <span class="point" aria-hidden="true"></span>
                    <span class="nom">
                      <b>{{ m.produit }}</b>
                      <small>{{ libelle(m.type) }} · {{ m.acteur }} · {{ m.date | date: 'd MMM, HH:mm' }}</small>
                    </span>
                    <span class="chiffres delta">{{ signe(m.type, m.quantite) > 0 ? '+' : '−' }}{{ m.quantite < 0 ? -m.quantite : m.quantite }}</span>
                  </li>
                } @empty {
                  <li class="vide">Aucun mouvement de stock pour l'instant.</li>
                }
              </ol>
            } @else {
              <div class="liste">
                @for (n of [1, 2, 3, 4]; track n) {
                  <span class="squelette" style="height: 36px"></span>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .accueil {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      overflow: hidden;
      padding: 32px 40px;
      border-radius: 20px;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      isolation: isolate;
    }
    // Le disque doré et l'anneau de la bannière de la boutique.
    .accueil::before {
      content: '';
      position: absolute;
      z-index: -1;
      top: -120px;
      right: -60px;
      width: 360px;
      aspect-ratio: 1;
      border-radius: 50%;
      background: var(--lce-gold);
    }
    .accueil::after {
      content: '';
      position: absolute;
      z-index: -1;
      bottom: -70px;
      right: 300px;
      width: 150px;
      aspect-ratio: 1;
      border: 2px solid rgb(255 255 255 / 18%);
      border-radius: 50%;
    }
    .accueil-texte {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      max-width: 560px;
    }
    .date {
      color: var(--lce-gold);
      font: 700 12px/16px var(--lce-police-texte);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font: 800 34px/42px var(--lce-police-titre);
      letter-spacing: -0.01em;
    }
    .accueil p {
      margin: 0 0 12px;
      color: rgb(255 255 255 / 72%);
      font-size: 15px;
      line-height: 22px;
    }
    .accueil img {
      flex: none;
      margin-right: 40px;
      object-fit: contain;
      filter: drop-shadow(0 12px 24px rgb(0 0 0 / 25%));
    }

    .grille {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }
    .tete {
      margin-bottom: 14px;
    }
    .tete .titre-carte {
      margin: 0;
    }
    .liste,
    .activite {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .liste li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      margin-inline: -8px;
      border-radius: 12px;
      transition: background-color 120ms;
    }
    .liste li:hover {
      background: var(--lce-adm-bg);
    }
    .nom {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .nom a,
    .nom b {
      overflow: hidden;
      color: var(--lce-ink);
      font: 700 14px/20px var(--lce-police-texte);
      text-decoration: none;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nom a:hover {
      color: var(--lce-navy-500);
    }
    .jauge {
      height: 6px;
      overflow: hidden;
      border-radius: 3px;
      background: var(--lce-neutre-soft);
    }
    .jauge span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--lce-gold);
      transition: width 400ms ease;
    }
    .jauge.epuise {
      background: var(--lce-danger-soft);
    }
    .quantite small {
      color: var(--lce-ink-muted);
    }
    .vide {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
      color: var(--lce-ink-muted);
      font-size: 14px;
    }

    .activite {
      gap: 0;
    }
    .activite li:not(.vide) {
      position: relative;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 0;
    }
    // Fil vertical qui relie les événements.
    .activite li:not(.vide):not(:last-child)::after {
      content: '';
      position: absolute;
      top: 32px;
      bottom: -10px;
      left: 5px;
      width: 2px;
      background: var(--lce-neutre-soft);
    }
    .point {
      flex: none;
      width: 12px;
      height: 12px;
      border: 3px solid var(--lce-success-soft);
      border-radius: 50%;
      background: var(--lce-success);
      box-sizing: border-box;
    }
    .moins .point {
      border-color: var(--lce-danger-soft);
      background: var(--lce-danger);
    }
    .nom small {
      overflow: hidden;
      color: var(--lce-ink-muted);
      font-size: 12px;
      line-height: 16px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .activite .nom {
      gap: 0;
    }
    .delta {
      color: var(--lce-success);
      font: 800 14px/20px var(--lce-police-texte);
    }
    .moins .delta {
      color: var(--lce-danger);
    }

    .commandes a {
      display: flex;
      flex: 1;
      align-items: center;
      gap: 14px;
      color: var(--lce-ink);
      text-decoration: none;
    }
    .montant {
      min-width: 100px;
      text-align: right;
    }

    @media (max-width: 1100px) {
      .grille {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 767px) {
      .accueil {
        padding: 24px 20px;
      }
      .accueil::before {
        width: 160px;
        top: -100px;
        right: -80px;
      }
      .accueil img {
        display: none;
      }
      h1 {
        font-size: 26px;
        line-height: 32px;
      }
    }
  `,
})
export class TableauDeBord {
  protected readonly session = inject(Session);
  private readonly stocks = inject(EtatStocks);
  private readonly etatVentes = inject(EtatVentes);
  protected readonly ventes = this.etatVentes.resume;
  protected readonly aTraiter = this.etatVentes.aTraiter;
  protected readonly statuts = STATUTS_COMMANDE;

  protected readonly aujourdhui = new Date();
  protected readonly vue = this.stocks.vue;
  protected readonly indicateurs = computed(() => this.vue()?.indicateurs);
  protected readonly alertes = this.stocks.alertes;

  private readonly enLigne = httpResource<ListeProduitsAdmin>(() =>
    this.peut('produit.voir') ? { url: `${API}/admin/produits`, params: { publication: 'publies' } } : undefined,
  );
  protected readonly publies = computed(() => (this.enLigne.hasValue() ? this.enLigne.value().total : null));

  protected readonly aReapprovisionner = computed(() =>
    (this.vue()?.lignes ?? [])
      .filter((l) => l.etat !== 'normal')
      .sort((a, b) => a.disponible / Math.max(a.seuilAlerte, 1) - b.disponible / Math.max(b.seuilAlerte, 1))
      .slice(0, 6),
  );
  protected readonly mouvements = computed(() => (this.vue()?.mouvements ?? []).slice(0, 6));

  protected peut(permission: string): boolean {
    return this.session.permissions().has(permission);
  }

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  protected remplissage(disponible: number, seuil: number): number {
    return Math.min(100, Math.round((disponible / Math.max(seuil, 1)) * 100));
  }

  protected libelle(type: string): string {
    return LIBELLES_MOUVEMENT[type] ?? type;
  }

  protected signe(type: string, quantite: number): number {
    return signeMouvement(type, quantite);
  }
}
