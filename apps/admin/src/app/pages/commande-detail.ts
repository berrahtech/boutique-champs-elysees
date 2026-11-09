import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ActionCommande, CommandeAdminDetail, EcritureActionCommande, LivreurAdmin, ModeEncaissement } from '@lce/contrats';
import { API, Session } from '@lce/session';
import { Bouton, FcfaPipe, Icone, NomIcone, PastilleStatut, STATUTS_COMMANDE } from '@lce/ui';
import { Panneau } from '../composants/panneau';
import { EtatStocks } from '../etat-stocks';
import { EtatVentes } from '../etat-ventes';
import { envoyer } from '../outils';

const ACTIONS: Record<ActionCommande, { libelle: string; icone: NomIcone; secondaire?: boolean }> = {
  preparer: { libelle: 'Lancer la préparation', icone: 'colis' },
  prete: { libelle: 'Prête à livrer', icone: 'valide-rond' },
  affecter: { libelle: 'Affecter un livreur', icone: 'livraison' },
  expedier: { libelle: 'Départ en livraison', icone: 'livraison' },
  livrer: { libelle: 'Marquer livrée', icone: 'succes' },
  echec: { libelle: 'Échec de livraison', icone: 'alerte', secondaire: true },
  relivrer: { libelle: 'Relancer la livraison', icone: 'retour' },
  retour: { libelle: 'Retour à l’entrepôt', icone: 'retour', secondaire: true },
  annuler: { libelle: 'Annuler', icone: 'fermer', secondaire: true },
};
/** Actions qui demandent une précision avant d'être envoyées. */
const AVEC_FORMULAIRE: ActionCommande[] = ['affecter', 'livrer', 'echec', 'annuler'];

const MODES: { id: ModeEncaissement; libelle: string }[] = [
  { id: 'ESPECES', libelle: 'Espèces' },
  { id: 'ORANGE_MONEY', libelle: 'Orange Money' },
  { id: 'MOOV_MONEY', libelle: 'Moov Money' },
];

/** Fiche d'une commande et son traitement (maquette « A-CommandeDetail »). */
@Component({
  selector: 'lce-commande-detail',
  imports: [DatePipe, FormsModule, RouterLink, Bouton, FcfaPipe, Icone, Panneau, PastilleStatut],
  template: `
    <div class="adm-corps">
      @if (commande(); as c) {
        <div class="adm-titre">
          <div class="titre-fiche">
            <a class="retour" routerLink="/admin/commandes" aria-label="Retour aux commandes"><lce-icone nom="chevron-gauche" [taille]="20" /></a>
            <div class="empile">
              <h1>{{ c.numero }}</h1>
              <span class="outils petit">
                <lce-pastille-statut [statut]="statuts[c.statut]" />
                <span class="attenue">{{ c.creeLe | date: "d MMMM yyyy 'à' HH:mm" }}</span>
              </span>
            </div>
          </div>
          <div class="outils">
            @for (a of secondaires(); track a) {
              <button lceBouton variante="clair" type="button" [class.danger]="a === 'annuler'" [disabled]="envoi()" (click)="lancer(a)">{{ actions[a].libelle }}</button>
            }
            @for (a of principales(); track a) {
              <button lceBouton type="button" [disabled]="envoi()" (click)="lancer(a)"><lce-icone [nom]="actions[a].icone" [taille]="18" />{{ a === 'affecter' && c.mission ? 'Changer de livreur' : actions[a].libelle }}</button>
            }
          </div>
        </div>

        @if (erreur() && !action()) {
          <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
        }

        <div class="deux-colonnes">
          <div class="principal">
            <section class="carte">
              <h2>Articles · {{ c.nbArticles }}</h2>
              <ul class="articles">
                @for (l of c.lignes; track l.produitId) {
                  <li>
                    <span class="vignette">
                      @if (l.image) {
                        <img [src]="l.image" alt="" loading="lazy" />
                      } @else {
                        <lce-icone nom="sac" [taille]="20" />
                      }
                    </span>
                    <span class="nom"><a [routerLink]="['/admin/produits', l.produitId]">{{ l.libelle }}</a><small>{{ l.prixUnitaire | fcfa }} l'unité</small></span>
                    <span class="quantite chiffres">× {{ l.quantite }}</span>
                    <b class="chiffres">{{ l.quantite * l.prixUnitaire | fcfa }}</b>
                  </li>
                }
              </ul>
              <dl class="montants">
                <div><dt>Sous-total</dt><dd class="chiffres">{{ c.sousTotal | fcfa }}</dd></div>
                <div><dt>Livraison · {{ c.zone }}</dt><dd class="chiffres">{{ c.fraisLivraison ? (c.fraisLivraison | fcfa) : 'Offerte' }}</dd></div>
                @if (c.remise) {
                  <div><dt>Remise</dt><dd class="chiffres promo">− {{ c.remise | fcfa }}</dd></div>
                }
                <div class="total"><dt>Total</dt><dd class="chiffres">{{ c.total | fcfa }}</dd></div>
              </dl>
            </section>

            <section class="carte">
              <h2>Historique</h2>
              <ol class="historique">
                @for (h of historiqueInverse(); track h.date + h.statut; let premier = $first) {
                  <li [class.dernier]="premier">
                    <span class="point" aria-hidden="true"></span>
                    <span class="empile">
                      <b>{{ statuts[h.statut].libelle }}</b>
                      <small class="attenue">{{ h.date | date: 'd MMM yyyy, HH:mm' }}{{ h.acteur ? ' · ' + h.acteur : '' }}</small>
                      @if (h.motif) {
                        <span class="motif">{{ h.motif }}</span>
                      }
                    </span>
                  </li>
                }
              </ol>
            </section>
          </div>

          <div class="lateral">
            <section class="carte">
              <h2>Client</h2>
              <div class="personne">
                <span class="avatar" aria-hidden="true">{{ c.client.nom.charAt(0) }}</span>
                <span class="empile">
                  @if (peutVoirClients()) {
                    <a class="lien-fort" [routerLink]="['/admin/clients', c.client.id]">{{ c.client.nom }}</a>
                  } @else {
                    <b>{{ c.client.nom }}</b>
                  }
                  <small class="attenue">{{ c.client.email ?? '' }}</small>
                </span>
              </div>
              @if (c.adresse.telephone) {
                <a class="appel" [href]="'tel:' + c.adresse.telephone"><lce-icone nom="telephone" [taille]="18" />{{ c.adresse.telephone }}</a>
              }
            </section>

            <section class="carte">
              <h2>Livraison</h2>
              <p class="adresse"><b>{{ c.adresse.nom }}</b><br />{{ c.adresse.quartier }} · {{ c.zone }}<br /><span class="attenue">{{ c.adresse.repere }}</span></p>
              @if (c.noteClient) {
                <p class="note"><lce-icone nom="message" [taille]="16" />{{ c.noteClient }}</p>
              }
              <div class="livreur">
                @if (c.mission; as m) {
                  <span class="icone-teinte" [class.vert]="m.statut === 'LIVREE'"><lce-icone nom="livraison" [taille]="20" /></span>
                  <span class="empile">
                    <b>{{ m.livreur.nom }}</b>
                    <small class="attenue">{{ m.livreur.telephone }} · {{ libelleMission[m.statut] }}</small>
                    @if (m.motif && m.statut !== 'LIVREE') {
                      <small class="motif">{{ m.motif }}</small>
                    }
                  </span>
                } @else {
                  <span class="icone-teinte"><lce-icone nom="livraison" [taille]="20" /></span>
                  <span class="attenue petit">Aucun livreur affecté</span>
                }
              </div>
            </section>

            <section class="carte">
              <h2>Paiement</h2>
              <p class="paiement">
                <lce-icone nom="especes" [taille]="20" />
                {{ c.moyen === 'A_LA_LIVRAISON' ? 'À la livraison' : c.moyen }}
              </p>
              @if (c.encaissement; as e) {
                <div class="encaisse">
                  <span><b class="chiffres">{{ e.montant | fcfa }}</b> encaissé{{ ' en ' + libelleMode(e.mode) }}</span>
                  <span class="etat" [class.sous-seuil]="e.statut === 'A_REVERSER'" [class.normal]="e.statut === 'REVERSE'">{{ e.statut === 'A_REVERSER' ? 'Chez le livreur' : 'Remis à la boutique' }}</span>
                </div>
              } @else if (c.statut !== 'ANNULEE') {
                <p class="petit attenue">{{ c.total | fcfa }} à encaisser à la livraison.</p>
              }
            </section>
          </div>
        </div>
      } @else if (ressource.error()) {
        <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ introuvable() ? 'Cette commande n’existe pas.' : 'Impossible de charger la commande. Vérifiez la connexion.' }}</p>
        <div class="outils">
          @if (!introuvable()) {
            <button lceBouton type="button" (click)="ressource.reload()">Réessayer</button>
          }
          <a lceBouton variante="clair" routerLink="/admin/commandes">Retour aux commandes</a>
        </div>
      } @else {
        <span class="squelette" style="height: 60px"></span>
        <div class="deux-colonnes">
          <div class="principal"><span class="squelette" style="height: 360px; border-radius: 16px"></span></div>
          <div class="lateral"><span class="squelette" style="height: 360px; border-radius: 16px"></span></div>
        </div>
      }
    </div>

    @if (action(); as a) {
      <lce-panneau [titre]="actions[a].libelle" [sousTitre]="commande()?.numero ?? ''" (fermer)="fermer()">
        <form id="form-action" class="formulaire" (ngSubmit)="confirmer(a)">
          @switch (a) {
            @case ('affecter') {
              <fieldset class="choix">
                <legend>Livreur</legend>
                @for (l of livreurs(); track l.id) {
                  <label class="option" [class.on]="livreurId === l.id">
                    <input type="radio" name="livreur" [value]="l.id" [(ngModel)]="livreurId" />
                    <span class="avatar petit-avatar" [class.dispo]="l.disponible">{{ l.nom.charAt(0) }}</span>
                    <span class="empile">
                      <b>{{ l.nom }}</b>
                      <small class="attenue">{{ l.disponible ? 'Disponible' : 'Indisponible' }} · {{ l.enCours }} en cours</small>
                    </span>
                  </label>
                } @empty {
                  <p class="petit attenue">Aucun livreur actif. Ajoutez-en dans « Livreurs et encaissements ».</p>
                }
              </fieldset>
            }
            @case ('livrer') {
              <p>Le client a reçu sa commande. Le stock réservé sort définitivement.</p>
              @if (commande()?.moyen === 'A_LA_LIVRAISON') {
                <fieldset class="choix">
                  <legend>{{ commande()?.total ?? 0 | fcfa }} encaissés en</legend>
                  @for (m of modes; track m.id) {
                    <label class="option" [class.on]="mode === m.id">
                      <input type="radio" name="mode" [value]="m.id" [(ngModel)]="mode" />
                      <b>{{ m.libelle }}</b>
                    </label>
                  }
                </fieldset>
              }
            }
            @case ('echec') {
              <div class="champ">
                <label for="motif">Que s'est-il passé ?</label>
                <textarea id="motif" name="motif" class="zone-texte" placeholder="Client injoignable, adresse introuvable…" [(ngModel)]="motif"></textarea>
              </div>
              <p class="petit attenue">Vous pourrez ensuite relancer la livraison ou rendre les articles au stock.</p>
            }
            @case ('annuler') {
              <div class="champ">
                <label for="motif">Motif de l'annulation</label>
                <textarea id="motif" name="motif" class="zone-texte" placeholder="Demande du client, article indisponible…" [(ngModel)]="motif"></textarea>
              </div>
              <p class="petit attenue">Les articles réservés retournent dans le stock disponible.</p>
            }
          }
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
        </form>
        <ng-container pied>
          <button lceBouton variante="clair" type="button" (click)="fermer()">Retour</button>
          <button lceBouton type="submit" form="form-action" [disabled]="envoi()">{{ envoi() ? 'Envoi…' : 'Confirmer' }}</button>
        </ng-container>
      </lce-panneau>
    }
  `,
  styles: `
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
    .retour:hover {
      border-color: var(--lce-ink);
    }
    .danger {
      color: var(--lce-danger);
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
    .nom a:hover {
      color: var(--lce-navy-500);
    }
    .nom small,
    small {
      font-size: 12px;
      line-height: 16px;
    }
    .quantite {
      color: var(--lce-ink-muted);
    }
    .montants {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 18px 0 0;
      padding-top: 16px;
      border-top: 1px solid var(--adm-ligne);
    }
    .montants div {
      display: flex;
      justify-content: space-between;
    }
    dt {
      color: var(--lce-ink-muted);
    }
    dd {
      margin: 0;
    }
    .montants .total {
      padding-top: 8px;
      font: 800 18px/24px var(--lce-police-titre);
    }
    .montants .total dt {
      color: var(--lce-ink);
    }
    .promo {
      color: var(--lce-promo);
    }
    .historique {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .historique li {
      position: relative;
      display: flex;
      gap: 14px;
      padding-bottom: 18px;
    }
    .historique li:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 16px;
      bottom: 0;
      left: 5px;
      width: 2px;
      background: var(--adm-ligne);
    }
    .historique .point {
      flex: none;
      width: 12px;
      height: 12px;
      margin-top: 4px;
      border-radius: 50%;
      background: var(--lce-line-fort);
    }
    .historique .dernier .point {
      background: var(--lce-gold);
      box-shadow: 0 0 0 4px var(--lce-gold-soft);
    }
    .motif {
      margin-top: 4px;
      padding: 6px 10px;
      border-radius: 8px;
      background: var(--lce-adm-bg);
      font-size: 13px;
    }
    .personne,
    .livreur {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      display: grid;
      place-items: center;
      flex: none;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--lce-navy);
      color: var(--lce-gold);
      font: 800 15px/1 var(--lce-police-texte);
    }
    .lien-fort {
      color: var(--lce-ink);
      font-weight: 800;
      text-decoration: none;
    }
    .lien-fort:hover {
      color: var(--lce-navy-500);
    }
    .appel {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 14px;
      padding: 10px;
      border-radius: 10px;
      background: var(--lce-success-soft);
      color: var(--lce-success);
      font: 800 14px/20px var(--lce-police-texte);
      text-decoration: none;
    }
    .adresse,
    .note,
    .paiement {
      margin: 0 0 12px;
      line-height: 22px;
    }
    .note {
      display: flex;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--lce-gold-soft);
      font-size: 14px;
    }
    .livreur {
      padding-top: 14px;
      border-top: 1px solid var(--adm-ligne);
    }
    .paiement {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
    }
    .encaisse {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      font-size: 14px;
    }
    .formulaire {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .formulaire p {
      margin: 0;
    }
    .choix {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      margin-bottom: 8px;
      font: 700 13px/20px var(--lce-police-texte);
    }
    .option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1.5px solid var(--adm-ligne);
      border-radius: 12px;
      cursor: pointer;
      transition:
        border-color 150ms,
        background-color 150ms;
    }
    .option input {
      position: absolute;
      opacity: 0;
    }
    .option.on {
      border-color: var(--lce-navy);
      background: var(--lce-adm-bg);
    }
    .option:focus-within {
      outline: 2px solid var(--lce-focus);
    }
    .petit-avatar {
      position: relative;
      width: 36px;
      height: 36px;
      font-size: 13px;
    }
    .petit-avatar.dispo::after {
      content: '';
      position: absolute;
      right: -1px;
      bottom: -1px;
      width: 10px;
      height: 10px;
      border: 2px solid var(--lce-surface);
      border-radius: 50%;
      background: var(--lce-success);
    }
  `,
})
export class CommandeDetail {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);
  private readonly stocks = inject(EtatStocks);
  private readonly ventes = inject(EtatVentes);

  readonly id = input.required<string>();

  protected readonly ressource = httpResource<CommandeAdminDetail>(() => `${API}/admin/commandes/${this.id()}`);
  protected readonly commande = linkedSignal<CommandeAdminDetail | undefined, CommandeAdminDetail | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v) => v,
  });
  protected readonly introuvable = computed(() => {
    const e = this.ressource.error();
    return e instanceof HttpErrorResponse && e.status === 404;
  });
  protected readonly principales = computed(() => (this.commande()?.actions ?? []).filter((a) => !ACTIONS[a].secondaire));
  protected readonly secondaires = computed(() => (this.commande()?.actions ?? []).filter((a) => ACTIONS[a].secondaire));
  protected readonly historiqueInverse = computed(() => [...(this.commande()?.historique ?? [])].reverse());
  protected readonly peutVoirClients = computed(() => this.session.permissions().has('client.voir'));

  protected readonly statuts = STATUTS_COMMANDE;
  protected readonly actions = ACTIONS;
  protected readonly modes = MODES;
  protected readonly libelleMission: Record<string, string> = {
    PROPOSEE: 'proposée',
    ACCEPTEE: 'affectée',
    REFUSEE: 'retirée',
    EN_COURS: 'en route',
    LIVREE: 'livrée',
    ECHEC: 'échec',
    RETOUR: 'retour',
  };

  protected readonly action = signal<ActionCommande | null>(null);
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected livreurId = '';
  protected mode: ModeEncaissement = 'ESPECES';
  protected motif = '';

  private readonly ressourceLivreurs = httpResource<LivreurAdmin[]>(() => {
    const c = this.commande();
    return this.action() === 'affecter' && c ? { url: `${API}/admin/livreurs/choix`, params: { zoneId: c.zoneId } } : undefined;
  });
  protected readonly livreurs = computed(() => (this.ressourceLivreurs.hasValue() ? this.ressourceLivreurs.value() : []));

  protected libelleMode(mode: ModeEncaissement): string {
    return MODES.find((m) => m.id === mode)?.libelle ?? mode;
  }

  protected lancer(a: ActionCommande): void {
    this.erreur.set(null);
    if (!AVEC_FORMULAIRE.includes(a)) {
      void this.envoyer({ action: a });
      return;
    }
    this.motif = '';
    this.mode = 'ESPECES';
    this.livreurId = this.commande()?.mission?.livreur.id ?? '';
    this.action.set(a);
  }

  protected fermer(): void {
    this.action.set(null);
    this.erreur.set(null);
  }

  protected confirmer(a: ActionCommande): void {
    if (a === 'affecter' && !this.livreurId) {
      this.erreur.set('Choisissez un livreur.');
      return;
    }
    void this.envoyer({
      action: a,
      ...(a === 'affecter' ? { livreurId: this.livreurId } : {}),
      ...(a === 'livrer' ? { mode: this.mode } : {}),
      ...(a === 'echec' || a === 'annuler' ? { motif: this.motif } : {}),
    });
  }

  private async envoyer(e: EcritureActionCommande): Promise<void> {
    const c = await envoyer(this.http.post<CommandeAdminDetail>(`${API}/admin/commandes/${this.id()}/actions`, e), this.erreur, this.envoi);
    if (c) {
      this.commande.set(c);
      this.action.set(null);
      this.ventes.recharger();
      // Livraison, annulation ou retour changent le stock : le menu et les stocks se mettent à jour.
      if (e.action === 'livrer' || e.action === 'annuler' || e.action === 'retour') this.stocks.recharger();
    }
  }
}
