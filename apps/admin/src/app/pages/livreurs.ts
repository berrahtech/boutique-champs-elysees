import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CaisseLivreur, LivreurAdmin, ZoneAdmin } from '@lce/contrats';
import { API, Session } from '@lce/session';
import { Bouton, FcfaPipe, Icone } from '@lce/ui';
import { Panneau } from '../composants/panneau';
import { envoyer, initiales } from '../outils';

const MODES: Record<string, string> = { ESPECES: 'Espèces', ORANGE_MONEY: 'Orange Money', MOOV_MONEY: 'Moov Money' };

interface FormulaireLivreur {
  nom: string;
  telephone: string;
  zoneIds: Set<string>;
  disponible: boolean;
  actif: boolean;
}

/** Livreurs et encaissements (maquette « A-Livreurs »). */
@Component({
  selector: 'lce-livreurs',
  imports: [DatePipe, FormsModule, Bouton, FcfaPipe, Icone, Panneau],
  template: `
    <div class="adm-corps">
      <div class="adm-titre">
        <div class="empile">
          <h1>Livreurs et encaissements</h1>
          <span class="attenue petit">L'argent encaissé à la livraison reste « à reverser » jusqu'à sa remise à la boutique.</span>
        </div>
        <button lceBouton type="button" (click)="ouvrir(null)"><lce-icone nom="ajout-compte" [taille]="18" />Nouveau livreur</button>
      </div>

      @if (livreurs(); as liste) {
        <div class="indicateurs">
          <div class="indicateur"><span class="icone-teinte vert"><lce-icone nom="livraison" [taille]="22" /></span><span class="l">Disponibles</span><span class="v">{{ nbDisponibles() }} / {{ liste.length }}</span></div>
          <div class="indicateur"><span class="icone-teinte"><lce-icone nom="colis" [taille]="22" /></span><span class="l">Livraisons en cours</span><span class="v">{{ enCours() }}</span></div>
          <div class="indicateur"><span class="icone-teinte or"><lce-icone nom="especes" [taille]="22" /></span><span class="l">À reverser</span><span class="v or">{{ aReverser() | fcfa }}</span></div>
        </div>

        <div class="grille">
          @for (l of liste; track l.id) {
            <article class="carte livreur" [class.inactif]="!l.actif">
              <div class="haut">
                <span class="avatar" [class.dispo]="l.disponible && l.actif" aria-hidden="true">{{ ini(l.nom) }}</span>
                <span class="empile">
                  <b>{{ l.nom }}</b>
                  <span class="petit attenue">{{ l.telephone }}</span>
                </span>
                <span class="etat" [class.normal]="l.actif && l.disponible" [class.brouillon]="!l.actif || !l.disponible">
                  {{ !l.actif ? 'Désactivé' : l.disponible ? 'Disponible' : 'Indisponible' }}
                </span>
              </div>
              <div class="zones">
                @for (z of l.zones; track z.id) {
                  <span>{{ z.nom }}</span>
                } @empty {
                  <span class="attenue">Aucune zone</span>
                }
              </div>
              <dl>
                <div><dt>En cours</dt><dd class="chiffres">{{ l.enCours }}</dd></div>
                <div><dt>Livrées</dt><dd class="chiffres">{{ l.livrees }}</dd></div>
                <div><dt>À reverser</dt><dd class="chiffres" [class.or]="l.aReverser > 0">{{ l.aReverser | fcfa }}</dd></div>
              </dl>
              <div class="outils">
                <button lceBouton variante="clair" [petit]="true" type="button" (click)="ouvrirCaisse(l)"><lce-icone nom="caisse" [taille]="16" />Caisse</button>
                <button lceBouton variante="clair" [petit]="true" type="button" (click)="ouvrir(l)">Modifier</button>
              </div>
            </article>
          } @empty {
            <div class="carte vide">
              <span class="icone-teinte"><lce-icone nom="livraison" [taille]="22" /></span>
              <b>Aucun livreur</b>
              <span class="petit attenue">Ajoutez vos livreurs pour leur affecter des commandes.</span>
            </div>
          }
        </div>
      } @else if (ressource.error()) {
        <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />Impossible de charger les livreurs.</p>
      } @else {
        <div class="grille">
          @for (n of [1, 2, 3]; track n) {
            <span class="carte squelette" style="height: 230px"></span>
          }
        </div>
      }
    </div>

    @if (edition(); as e) {
      <lce-panneau [titre]="e.id ? e.nom : 'Nouveau livreur'" [sousTitre]="e.id ? 'Modifier le livreur' : 'Il choisira son mot de passe dans l’application livreur'" (fermer)="edition.set(null)">
        <form id="form-livreur" class="formulaire" (ngSubmit)="enregistrer()">
          <div class="champ"><label for="l-nom">Nom complet</label><input id="l-nom" name="nom" class="saisie" autocomplete="off" [(ngModel)]="f.nom" /></div>
          <div class="champ"><label for="l-tel">Téléphone</label><input id="l-tel" name="tel" class="saisie" inputmode="tel" placeholder="70 00 00 00" autocomplete="off" [(ngModel)]="f.telephone" /></div>
          <fieldset>
            <legend>Zones desservies</legend>
            @for (z of zones(); track z.id) {
              <label class="case"><input type="checkbox" [name]="'z' + z.id" [checked]="f.zoneIds.has(z.id)" (change)="basculerZone(z.id)" />{{ z.nom }}</label>
            } @empty {
              <span class="petit attenue">Créez d'abord des zones dans « Zones et tarifs ».</span>
            }
          </fieldset>
          <label class="case"><input type="checkbox" name="dispo" [(ngModel)]="f.disponible" />Disponible pour de nouvelles livraisons</label>
          @if (e.id) {
            <label class="case"><input type="checkbox" name="actif" [(ngModel)]="f.actif" />Compte actif</label>
          }
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
        </form>
        <ng-container pied>
          <button lceBouton variante="clair" type="button" (click)="edition.set(null)">Annuler</button>
          <button lceBouton type="submit" form="form-livreur" [disabled]="envoi()">{{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </ng-container>
      </lce-panneau>
    }

    @if (caisseOuverte(); as l) {
      <lce-panneau [titre]="'Caisse de ' + l.nom" sousTitre="Argent encaissé à la livraison" (fermer)="caisseOuverte.set(null)">
        @if (caisse(); as c) {
          <div class="solde" [class.vide]="!c.livreur.aReverser">
            <span class="petit">À reverser</span>
            <b class="chiffres">{{ c.livreur.aReverser | fcfa }}</b>
            @if (c.livreur.aReverser && peutValider()) {
              <button lceBouton variante="clair" type="button" [disabled]="envoi()" (click)="reverser(c.livreur)">Valider la remise de {{ c.livreur.aReverser | fcfa }}</button>
            }
          </div>
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
          <h3>Encaissements</h3>
          <ul class="lignes">
            @for (e of c.encaissements; track e.id) {
              <li>
                <span class="empile"><b>{{ e.commande }}</b><small>{{ modes[e.mode] }} · {{ e.encaisseLe | date: 'd MMM, HH:mm' }}</small></span>
                <span class="empile droite"><b class="chiffres">{{ e.montant | fcfa }}</b><span class="etat" [class.sous-seuil]="e.statut === 'A_REVERSER'" [class.normal]="e.statut === 'REVERSE'">{{ e.statut === 'A_REVERSER' ? 'À reverser' : 'Reversé' }}</span></span>
              </li>
            } @empty {
              <li class="attenue petit">Aucun encaissement.</li>
            }
          </ul>
          <h3>Remises validées</h3>
          <ul class="lignes">
            @for (r of c.reversements; track r.id) {
              <li>
                <span class="empile"><b class="chiffres">{{ r.montant | fcfa }}</b><small>{{ r.declareLe | date: 'd MMM yyyy, HH:mm' }}{{ r.valideePar ? ' · par ' + r.valideePar : '' }}</small></span>
                <lce-icone nom="valide-rond" [taille]="20" class="ok" />
              </li>
            } @empty {
              <li class="attenue petit">Aucune remise pour l'instant.</li>
            }
          </ul>
        } @else {
          <span class="squelette" style="height: 120px; border-radius: 14px"></span>
        }
      </lce-panneau>
    }
  `,
  styles: `
    .grille {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 16px;
    }
    .livreur {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .livreur.inactif {
      opacity: 0.6;
    }
    .haut {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .haut .empile {
      flex: 1;
      min-width: 0;
    }
    .avatar {
      position: relative;
      display: grid;
      place-items: center;
      flex: none;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: var(--lce-navy);
      color: var(--lce-gold);
      font: 800 14px/1 var(--lce-police-texte);
    }
    .avatar.dispo::after {
      content: '';
      position: absolute;
      right: 0;
      bottom: 0;
      width: 12px;
      height: 12px;
      border: 2px solid var(--lce-surface);
      border-radius: 50%;
      background: var(--lce-success);
    }
    .zones {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .zones span {
      padding: 2px 8px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-adm-bg);
      font: 600 12px/20px var(--lce-police-texte);
    }
    dl {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      margin: 0;
      padding: 12px 0;
      border-block: 1px solid var(--adm-ligne);
    }
    dt {
      color: var(--lce-ink-muted);
      font-size: 12px;
    }
    dd {
      margin: 2px 0 0;
      font: 800 16px/22px var(--lce-police-titre);
    }
    dd.or {
      color: var(--lce-gold-text);
    }
    .vide {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 40px;
      text-align: center;
    }
    .formulaire {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    fieldset {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding: 14px 16px;
      border: 1px solid var(--adm-ligne);
      border-radius: 12px;
    }
    legend {
      padding: 0 6px;
      font: 700 13px/20px var(--lce-police-texte);
    }
    .solde {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      padding: 20px;
      border-radius: 16px;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .solde b {
      color: var(--lce-gold);
      font: 800 30px/36px var(--lce-police-titre);
    }
    .solde button {
      margin-top: 8px;
    }
    .solde.vide b {
      color: var(--lce-on-navy);
    }
    h3 {
      margin: 6px 0 0;
      font: 800 14px/20px var(--lce-police-titre);
    }
    .lignes {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .lignes li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--adm-ligne);
    }
    .lignes small {
      color: var(--lce-ink-muted);
      font-size: 12px;
    }
    .droite {
      align-items: flex-end;
    }
    .ok {
      color: var(--lce-success);
    }
  `,
})
export class Livreurs {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);

  protected readonly ressource = httpResource<LivreurAdmin[]>(() => `${API}/admin/livreurs`);
  protected readonly livreurs = linkedSignal<LivreurAdmin[] | undefined, LivreurAdmin[] | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });
  private readonly ressourceZones = httpResource<ZoneAdmin[]>(() => (this.session.permissions().has('zone.gerer') ? `${API}/admin/zones` : `${API}/zones`));
  protected readonly zones = computed(() => (this.ressourceZones.hasValue() ? this.ressourceZones.value() : []));

  protected readonly nbDisponibles = computed(() => this.livreurs()?.filter((l) => l.actif && l.disponible).length ?? 0);
  protected readonly enCours = computed(() => this.livreurs()?.reduce((n, l) => n + l.enCours, 0) ?? 0);
  protected readonly aReverser = computed(() => this.livreurs()?.reduce((n, l) => n + l.aReverser, 0) ?? 0);
  protected readonly peutValider = computed(() => this.session.permissions().has('caisse.valider'));
  protected readonly modes = MODES;

  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected readonly edition = signal<{ id: string | null; nom: string } | null>(null);
  protected f: FormulaireLivreur = { nom: '', telephone: '', zoneIds: new Set(), disponible: true, actif: true };

  protected readonly caisseOuverte = signal<LivreurAdmin | null>(null);
  private readonly ressourceCaisse = httpResource<CaisseLivreur>(() => {
    const l = this.caisseOuverte();
    return l ? `${API}/admin/livreurs/${l.id}/caisse` : undefined;
  });
  protected readonly caisse = linkedSignal<CaisseLivreur | undefined, CaisseLivreur | undefined>({
    source: () => (this.ressourceCaisse.hasValue() ? this.ressourceCaisse.value() : undefined),
    computation: (v) => v,
  });

  protected ini(nom: string): string {
    return initiales(nom);
  }

  protected ouvrir(l: LivreurAdmin | null): void {
    this.erreur.set(null);
    this.f = l
      ? { nom: l.nom, telephone: l.telephone ?? '', zoneIds: new Set(l.zones.map((z) => z.id)), disponible: l.disponible, actif: l.actif }
      : { nom: '', telephone: '', zoneIds: new Set(), disponible: true, actif: true };
    this.edition.set({ id: l?.id ?? null, nom: l?.nom ?? '' });
  }

  protected basculerZone(id: string): void {
    if (this.f.zoneIds.has(id)) this.f.zoneIds.delete(id);
    else this.f.zoneIds.add(id);
  }

  protected async enregistrer(): Promise<void> {
    const id = this.edition()?.id;
    const corps = { nom: this.f.nom, telephone: this.f.telephone, zoneIds: [...this.f.zoneIds], disponible: this.f.disponible, actif: this.f.actif };
    const requete = id ? this.http.patch<LivreurAdmin[]>(`${API}/admin/livreurs/${id}`, corps) : this.http.post<LivreurAdmin[]>(`${API}/admin/livreurs`, corps);
    const liste = await envoyer(requete, this.erreur, this.envoi);
    if (liste) {
      this.livreurs.set(liste);
      this.edition.set(null);
    }
  }

  protected ouvrirCaisse(l: LivreurAdmin): void {
    this.erreur.set(null);
    this.caisseOuverte.set(l);
  }

  protected async reverser(l: LivreurAdmin): Promise<void> {
    const c = await envoyer(this.http.post<CaisseLivreur>(`${API}/admin/livreurs/${l.id}/reversements`, {}), this.erreur, this.envoi);
    if (c) {
      this.caisse.set(c);
      this.livreurs.update((liste) => liste?.map((x) => (x.id === l.id ? c.livreur : x)));
    }
  }
}
