import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { CommandeClient, CommandeResume, StatutCommande } from '@lce/contrats';
import { API, Session, versErreurApi } from '@lce/session';
import { Bouton, FcfaPipe, Icone, MenuClient, PastilleStatut, STATUTS_COMMANDE } from '@lce/ui';
import { firstValueFrom } from 'rxjs';
import { Notifications } from '../etat/notifications';

/** Les 4 étapes montrées au client ; les statuts internes s'y rattachent. */
const ETAPES = [
  { libelle: 'Confirmée', icone: 'valide-rond' as const },
  { libelle: 'En préparation', icone: 'colis' as const },
  { libelle: 'En livraison', icone: 'livraison' as const },
  { libelle: 'Livrée', icone: 'succes' as const },
];
const ETAPE_DU_STATUT: Partial<Record<StatutCommande, number>> = {
  EN_ATTENTE_PAIEMENT: 0,
  CONFIRMEE: 0,
  EN_PREPARATION: 1,
  EN_ATTENTE_AFFECTATION: 1,
  AFFECTEE: 2,
  EN_COURS_LIVRAISON: 2,
  ECHEC_LIVRAISON: 2,
  LIVREE: 3,
};

/** Mes commandes et le suivi d'une commande (maquettes « Commandes » et « Suivi »). */
@Component({
  selector: 'lce-mes-commandes',
  imports: [DatePipe, RouterLink, Bouton, FcfaPipe, Icone, MenuClient, PastilleStatut],
  template: `
    <div class="lce-conteneur page">
      <nav class="fil" aria-label="Fil d'Ariane">
        <a routerLink="/">Accueil</a><lce-icone nom="chevron-droite" [taille]="14" />
        <a routerLink="/compte">Mon compte</a><lce-icone nom="chevron-droite" [taille]="14" />
        @if (numero()) {
          <a routerLink="/compte/commandes">Mes commandes</a><lce-icone nom="chevron-droite" [taille]="14" /><span aria-current="page">{{ numero() }}</span>
        } @else {
          <span aria-current="page">Mes commandes</span>
        }
      </nav>
      <div class="disposition">
        <lce-menu-client (deconnecter)="deconnecter()" />
        <div class="contenu">
          @if (numero()) {
            @if (commande(); as c) {
              @if (nouvelle()) {
                <section class="merci">
                  <span class="disque"><lce-icone nom="succes" [taille]="34" /></span>
                  <div>
                    <h1>Merci, votre commande est enregistrée</h1>
                    <p>Nous vous appelons au {{ c.adresse.telephone }} pour convenir de la livraison. Vous paierez {{ c.total | fcfa }} à la réception.</p>
                  </div>
                </section>
              }
              <div class="entete">
                <div>
                  <h1 class="titre-commande">Commande {{ c.numero }}</h1>
                  <span class="attenue">Passée le {{ c.creeLe | date: "d MMMM yyyy 'à' HH:mm" }}</span>
                </div>
                <lce-pastille-statut [statut]="statuts[c.statut]" />
              </div>

              @if (c.statut === 'ANNULEE' || c.statut === 'RETOUR_ENTREPOT') {
                <p class="alerte"><lce-icone nom="information" [taille]="18" />Cette commande a été annulée{{ motif() ? ' : ' + motif() : '' }}.</p>
              } @else {
                <ol class="suivi" [attr.aria-label]="'Étape ' + (etape() + 1) + ' sur 4'">
                  @for (e of etapes; track e.libelle; let i = $index) {
                    <li [class.fait]="i <= etape()" [class.courante]="i === etape()">
                      <span class="point"><lce-icone [nom]="e.icone" [taille]="18" /></span>
                      <span>{{ e.libelle }}</span>
                    </li>
                  }
                </ol>
                @if (c.statut === 'ECHEC_LIVRAISON') {
                  <p class="alerte"><lce-icone nom="alerte" [taille]="18" />Le livreur n'a pas pu vous livrer. Nous vous rappelons pour une nouvelle livraison.</p>
                }
              }

              <div class="grille">
                <section class="panneau">
                  <h2 class="titre-3">Articles</h2>
                  <ul class="articles">
                    @for (l of c.lignes; track l.produitId) {
                      <li>
                        <span class="vignette">
                          @if (l.image) {
                            <img [src]="l.image" alt="" width="56" height="56" loading="lazy" />
                          } @else {
                            <lce-icone nom="sac" [taille]="24" />
                          }
                        </span>
                        <span class="nom">
                          @if (l.slug) {
                            <a [routerLink]="['/produit', l.slug]">{{ l.libelle }}</a>
                          } @else {
                            {{ l.libelle }}
                          }
                          <small>{{ l.quantite }} × {{ l.prixUnitaire | fcfa }}</small>
                        </span>
                        <b class="chiffres">{{ l.quantite * l.prixUnitaire | fcfa }}</b>
                      </li>
                    }
                  </ul>
                  <hr class="filet" />
                  <div class="ligne-montant"><span>Sous-total</span><span class="chiffres">{{ c.sousTotal | fcfa }}</span></div>
                  <div class="ligne-montant"><span>Livraison</span><span class="chiffres">{{ c.fraisLivraison ? (c.fraisLivraison | fcfa) : 'Offerte' }}</span></div>
                  @if (c.remise) {
                    <div class="ligne-montant"><span>Réduction</span><span class="chiffres promo">− {{ c.remise | fcfa }}</span></div>
                  }
                  <div class="ligne-montant total"><span>Total</span><b class="chiffres">{{ c.total | fcfa }}</b></div>
                </section>

                <section class="panneau">
                  <h2 class="titre-3">Livraison</h2>
                  <p class="adresse">
                    <b>{{ c.adresse.nom }}</b><br />
                    {{ c.adresse.telephone }}<br />
                    {{ c.adresse.quartier }} · {{ c.zone }}<br />
                    <span class="attenue">{{ c.adresse.repere }}</span>
                  </p>
                  @if (c.noteClient) {
                    <p class="note"><lce-icone nom="message" [taille]="16" />{{ c.noteClient }}</p>
                  }
                  <h2 class="titre-3">Paiement</h2>
                  <p>{{ c.moyen === 'A_LA_LIVRAISON' ? 'À la livraison, en espèces ou Mobile Money' : c.moyen }}</p>
                  @if (c.statut === 'CONFIRMEE') {
                    @if (erreur()) {
                      <p class="erreur" role="alert">{{ erreur() }}</p>
                    }
                    <button lceBouton variante="contour" type="button" [pleineLargeur]="true" [disabled]="envoi()" (click)="annuler()">Annuler la commande</button>
                  }
                </section>
              </div>
            } @else if (ressourceDetail.error()) {
              <div class="vide"><lce-icone nom="colis" [taille]="48" /><h1 class="titre-2">Commande introuvable</h1><a lceBouton routerLink="/compte/commandes">Mes commandes</a></div>
            } @else {
              <p class="attente" role="status">Chargement de la commande…</p>
            }
          } @else {
            <h1 class="titre-1">Mes commandes</h1>
            @if (commandes(); as liste) {
              <ul class="liste">
                @for (c of liste; track c.id) {
                  <li>
                    <a class="panneau ligne-commande" [routerLink]="['/compte/commandes', c.numero]">
                      <span class="icone-colis"><lce-icone nom="colis" [taille]="24" /></span>
                      <span class="infos">
                        <b>{{ c.numero }}</b>
                        <small>{{ c.creeLe | date: 'd MMM yyyy' }} · {{ c.nbArticles }} article{{ c.nbArticles > 1 ? 's' : '' }}</small>
                      </span>
                      <lce-pastille-statut [statut]="statuts[c.statut]" />
                      <b class="chiffres montant">{{ c.total | fcfa }}</b>
                      <lce-icone nom="chevron-droite" [taille]="18" />
                    </a>
                  </li>
                } @empty {
                  <li class="vide">
                    <lce-icone nom="colis" [taille]="48" />
                    <h2 class="titre-3">Aucune commande pour l'instant</h2>
                    <a lceBouton routerLink="/boutique">Découvrir la boutique</a>
                  </li>
                }
              </ul>
            } @else {
              <p class="attente" role="status">Chargement de vos commandes…</p>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-block: 24px 64px;
    }
    .fil {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .fil a {
      color: var(--lce-ink-muted);
      text-decoration: none;
    }
    .disposition {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 32px;
    }
    lce-menu-client {
      flex: 1 1 260px;
      max-width: 300px;
    }
    .contenu {
      flex: 999 1 560px;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .merci {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 22px;
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-success-soft);
    }
    .merci h1 {
      margin: 0 0 4px;
      font: 800 22px/28px var(--lce-police-titre);
    }
    .merci p {
      margin: 0;
    }
    .disque {
      display: grid;
      place-items: center;
      flex: none;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--lce-success);
      color: var(--lce-on-navy);
    }
    .entete {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .titre-commande {
      margin: 0;
      font: 800 26px/32px var(--lce-police-titre);
    }
    .suivi {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      margin: 0;
      padding: 20px;
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-carte);
      background: var(--lce-surface);
      list-style: none;
    }
    .suivi li {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--lce-ink-muted);
      font: 600 13px/18px var(--lce-police-texte);
      text-align: center;
    }
    // Trait qui relie chaque étape à la suivante.
    .suivi li:not(:last-child)::after {
      content: '';
      position: absolute;
      z-index: 0;
      top: 19px;
      left: calc(50% + 24px);
      width: calc(100% - 48px);
      height: 3px;
      border-radius: 2px;
      background: var(--lce-line);
    }
    .suivi li.fait:not(.courante)::after {
      background: var(--lce-success);
    }
    .point {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--lce-neutre-soft);
    }
    .fait {
      color: var(--lce-ink);
    }
    .fait .point {
      background: var(--lce-success);
      color: var(--lce-on-navy);
    }
    .courante .point {
      background: var(--lce-navy);
      color: var(--lce-gold);
      box-shadow: 0 0 0 6px rgb(255 180 0 / 22%);
    }
    .alerte {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 0;
      padding: 12px 14px;
      border-radius: var(--lce-rayon-controle);
      background: var(--lce-creme);
      font-weight: 600;
    }
    .grille {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }
    .panneau {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .panneau h2 {
      margin: 0;
    }
    .articles {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .articles li {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .vignette {
      display: grid;
      place-items: center;
      flex: none;
      width: 56px;
      height: 56px;
      overflow: hidden;
      border: 1px solid var(--lce-line);
      border-radius: 10px;
    }
    .vignette img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .nom {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .nom a {
      color: var(--lce-ink);
      font-weight: 700;
      text-decoration: none;
    }
    .nom small {
      color: var(--lce-ink-muted);
    }
    .total {
      font-size: 18px;
    }
    .promo {
      color: var(--lce-promo);
    }
    .adresse,
    .note,
    .panneau p {
      margin: 0;
      line-height: 22px;
    }
    .note {
      display: flex;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--lce-saisie-fond);
      font-size: 14px;
    }
    .liste {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ligne-commande {
      display: flex;
      align-items: center;
      gap: 14px;
      color: var(--lce-ink);
      text-decoration: none;
      transition: border-color 150ms;
    }
    .ligne-commande:hover {
      border-color: var(--lce-navy);
    }
    .icone-colis {
      display: grid;
      place-items: center;
      flex: none;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--lce-gold-soft);
      color: var(--lce-gold-text);
    }
    .infos {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .infos small {
      color: var(--lce-ink-muted);
    }
    .montant {
      min-width: 110px;
      text-align: right;
    }
    .vide {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 24px;
      text-align: center;
    }
    .attente {
      padding: 72px 0;
      text-align: center;
    }
    @media (max-width: 860px) {
      lce-menu-client {
        max-width: none;
      }
      .grille {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 640px) {
      .suivi {
        padding: 16px 8px;
        font-size: 11px;
      }
      .ligne-commande lce-pastille-statut {
        display: none;
      }
      .montant {
        min-width: 0;
      }
    }
  `,
})
export class MesCommandes {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);
  protected readonly session = inject(Session);

  /** Présent sur /compte/commandes/:numero. */
  readonly numero = input<string>();
  /** Arrivée depuis la validation de commande. */
  readonly nouvelle = input<string>();

  protected readonly statuts = STATUTS_COMMANDE;
  protected readonly etapes = ETAPES;

  private readonly ressourceListe = httpResource<CommandeResume[]>(() =>
    this.session.connecte() && !this.numero() ? `${API}/commandes` : undefined,
  );
  protected readonly commandes = computed(() => (this.ressourceListe.hasValue() ? this.ressourceListe.value() : undefined));

  protected readonly ressourceDetail = httpResource<CommandeClient>(() => {
    const n = this.numero();
    return this.session.connecte() && n ? `${API}/commandes/${encodeURIComponent(n)}` : undefined;
  });
  protected readonly commande = linkedSignal<CommandeClient | undefined, CommandeClient | undefined>({
    source: () => (this.ressourceDetail.hasValue() ? this.ressourceDetail.value() : undefined),
    computation: (v) => v,
  });
  protected readonly etape = computed(() => ETAPE_DU_STATUT[this.commande()?.statut ?? 'CONFIRMEE'] ?? 0);
  protected readonly motif = computed(() => [...(this.commande()?.historique ?? [])].reverse().find((h) => h.motif)?.motif ?? null);

  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.session.pret() && !this.session.connecte()) {
        void this.router.navigate(['/connexion'], { queryParams: { retour: this.router.url }, replaceUrl: true });
      }
    });
  }

  protected async annuler(): Promise<void> {
    const c = this.commande();
    if (!c || !confirm('Annuler cette commande ?')) return;
    this.envoi.set(true);
    this.erreur.set(null);
    try {
      this.commande.set(await firstValueFrom(this.http.post<CommandeClient>(`${API}/commandes/${encodeURIComponent(c.numero)}/annulation`, {})));
      this.notifications.afficher('Votre commande est annulée.');
    } catch (e) {
      this.erreur.set(versErreurApi(e).messageUtilisateur);
    } finally {
      this.envoi.set(false);
    }
  }

  protected async deconnecter(): Promise<void> {
    await this.session.deconnecter();
    await this.router.navigateByUrl('/');
  }
}
