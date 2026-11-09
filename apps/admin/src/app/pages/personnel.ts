import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MembrePersonnel, RoleAdmin, VuePersonnel } from '@lce/contrats';
import { API, Session } from '@lce/session';
import { Bouton, Icone } from '@lce/ui';
import { Panneau } from '../composants/panneau';
import { envoyer, initiales } from '../outils';

const MODULES: Record<string, string> = {
  pilotage: 'Pilotage',
  commande: 'Commandes',
  client: 'Clients',
  marketing: 'Marketing',
  catalogue: 'Catalogue',
  livraison: 'Livraison',
  administration: 'Administration',
};

interface FormulaireMembre {
  nom: string;
  telephone: string;
  email: string;
  roleId: string;
  motDePasse: string;
  actif: boolean;
}

/** Utilisateurs (personnel) et rôles (maquette « A-Rôles »). */
@Component({
  selector: 'lce-personnel',
  imports: [FormsModule, Bouton, Icone, Panneau],
  template: `
    <div class="adm-corps">
      <div class="adm-titre">
        <div class="empile">
          <h1>Utilisateurs et rôles</h1>
          <span class="attenue petit">Les comptes de l'équipe et ce que chacun peut faire. Un changement prend effet à la prochaine connexion.</span>
        </div>
        @if (onglet() === 'equipe') {
          <button lceBouton type="button" (click)="ouvrirMembre(null)"><lce-icone nom="ajout-compte" [taille]="18" />Ajouter un membre</button>
        } @else if (peutRoles()) {
          <button lceBouton type="button" (click)="ouvrirRole(null)"><lce-icone nom="plus" [taille]="18" />Nouveau rôle</button>
        }
      </div>

      <div class="onglets" role="tablist" aria-label="Rubrique">
        <button type="button" role="tab" class="onglet" [class.on]="onglet() === 'equipe'" [attr.aria-selected]="onglet() === 'equipe'" (click)="onglet.set('equipe')">
          Équipe<span>{{ vue()?.membres?.length ?? 0 }}</span>
        </button>
        <button type="button" role="tab" class="onglet" [class.on]="onglet() === 'roles'" [attr.aria-selected]="onglet() === 'roles'" (click)="onglet.set('roles')">
          Rôles<span>{{ vue()?.roles?.length ?? 0 }}</span>
        </button>
      </div>

      @if (vue(); as v) {
        @if (onglet() === 'equipe') {
          <div class="tableau-cadre">
            <table class="tableau">
              <thead>
                <tr>
                  <th scope="col">Membre</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Rôle</th>
                  <th scope="col">État</th>
                  <th scope="col"><span class="lce-visuellement-masque">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @for (m of v.membres; track m.id) {
                  <tr [class.inactif]="!m.actif">
                    <td>
                      <span class="produit-cellule">
                        <span class="avatar" aria-hidden="true">{{ ini(m.nom) }}</span>
                        <span class="nom"><b>{{ m.nom }}</b>@if (m.id === moi()) {<small>C'est vous</small>}</span>
                      </span>
                    </td>
                    <td class="petit">{{ m.telephone ?? '—' }}<br /><span class="attenue">{{ m.email ?? '' }}</span></td>
                    <td><span class="role">{{ m.role.nom }}</span></td>
                    <td><span class="etat" [class.normal]="m.actif" [class.brouillon]="!m.actif">{{ m.actif ? 'Actif' : 'Désactivé' }}</span></td>
                    <td class="a-droite"><button type="button" class="action" [attr.aria-label]="'Modifier ' + m.nom" (click)="ouvrirMembre(m)"><lce-icone nom="chevron-droite" [taille]="18" /></button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="roles">
            @for (r of v.roles; track r.id) {
              <button type="button" class="carte role-carte" (click)="ouvrirRole(r)">
                <span class="entre">
                  <span class="icone-teinte" [class.noir]="r.verrouille"><lce-icone [nom]="r.verrouille ? 'cadenas' : 'roles'" [taille]="22" /></span>
                  <span class="petit attenue">{{ r.membres }} membre{{ r.membres > 1 ? 's' : '' }}</span>
                </span>
                <b>{{ r.nom }}</b>
                <span class="petit attenue">{{ r.permissions.length }} permission{{ r.permissions.length > 1 ? 's' : '' }}{{ r.verrouille ? ' · non modifiable' : '' }}</span>
                <span class="modules">
                  @for (m of modulesDe(r); track m) {
                    <span>{{ m }}</span>
                  }
                </span>
              </button>
            }
          </div>
        }
      } @else if (ressource.error()) {
        <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />Impossible de charger l'équipe.</p>
      } @else {
        <span class="squelette" style="height: 280px; border-radius: 16px"></span>
      }
    </div>

    @if (membre(); as e) {
      <lce-panneau [titre]="e.id ? e.nom : 'Ajouter un membre'" [sousTitre]="e.id ? 'Modifier le compte' : 'Il recevra ses codes de connexion par SMS'" (fermer)="membre.set(null)">
        <form id="form-membre" class="formulaire" (ngSubmit)="enregistrerMembre()">
          <div class="champ"><label for="m-nom">Nom complet</label><input id="m-nom" name="nom" class="saisie" autocomplete="off" [(ngModel)]="fm.nom" /></div>
          <div class="champ">
            <label for="m-tel">Téléphone</label>
            <input id="m-tel" name="tel" class="saisie" inputmode="tel" placeholder="70 00 00 00" autocomplete="off" [readOnly]="!!e.id" [(ngModel)]="fm.telephone" />
            @if (e.id) {
              <span class="aide">Le numéro sert d'identifiant : il ne se modifie pas.</span>
            }
          </div>
          <div class="champ"><label for="m-email">E-mail (facultatif)</label><input id="m-email" name="email" class="saisie" type="email" autocomplete="off" [(ngModel)]="fm.email" /></div>
          <div class="champ">
            <label for="m-role">Rôle</label>
            <select id="m-role" name="role" class="saisie" [(ngModel)]="fm.roleId">
              @for (r of vue()?.roles ?? []; track r.id) {
                <option [value]="r.id">{{ r.nom }}</option>
              }
            </select>
          </div>
          <div class="champ">
            <label for="m-mdp">{{ e.id ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe provisoire' }}</label>
            <input id="m-mdp" name="mdp" class="saisie" type="text" autocomplete="new-password" placeholder="8 caractères, lettres et chiffres" [(ngModel)]="fm.motDePasse" />
            <span class="aide">Communiquez-le en main propre. La connexion demande aussi un code SMS.</span>
          </div>
          @if (e.id) {
            <label class="case"><input type="checkbox" name="actif" [(ngModel)]="fm.actif" [disabled]="e.id === moi()" />Compte actif</label>
          }
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
        </form>
        <ng-container pied>
          <button lceBouton variante="clair" type="button" (click)="membre.set(null)">Annuler</button>
          <button lceBouton type="submit" form="form-membre" [disabled]="envoi()">{{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </ng-container>
      </lce-panneau>
    }

    @if (role(); as r) {
      <lce-panneau [titre]="r.id ? r.nom : 'Nouveau rôle'" [sousTitre]="r.verrouille ? 'Rôle réservé : ses permissions ne se modifient pas.' : 'Cochez ce que ce rôle peut faire.'" (fermer)="role.set(null)">
        <form id="form-role" class="formulaire" (ngSubmit)="enregistrerRole()">
          @if (!r.systeme) {
            <div class="champ"><label for="r-nom">Nom du rôle</label><input id="r-nom" name="nom" class="saisie" placeholder="Préparateur de commandes" [(ngModel)]="nomRole" /></div>
          }
          @for (g of groupes(); track g.module) {
            <fieldset>
              <legend>{{ g.libelle }}</legend>
              @for (p of g.permissions; track p.code) {
                <label class="case permission">
                  <input type="checkbox" [name]="p.code" [checked]="coches().has(p.code)" [disabled]="r.verrouille" (change)="basculer(p.code)" />
                  <span>{{ p.libelle }}</span>
                </label>
              }
            </fieldset>
          }
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
        </form>
        <ng-container pied>
          @if (r.id && !r.systeme && r.membres === 0) {
            <button lceBouton variante="clair" type="button" class="supprimer" [disabled]="envoi()" (click)="supprimerRole(r.id)">Supprimer</button>
          }
          <button lceBouton variante="clair" type="button" (click)="role.set(null)">{{ r.verrouille ? 'Fermer' : 'Annuler' }}</button>
          @if (!r.verrouille) {
            <button lceBouton type="submit" form="form-role" [disabled]="envoi()">{{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          }
        </ng-container>
      </lce-panneau>
    }
  `,
  styles: `
    .tableau {
      min-width: 720px;
    }
    .inactif .produit-cellule {
      opacity: 0.55;
    }
    .avatar {
      display: grid;
      place-items: center;
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--lce-navy);
      color: var(--lce-gold);
      font: 800 13px/1 var(--lce-police-texte);
    }
    .role {
      display: inline-block;
      padding: 3px 10px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-adm-bg);
      font: 700 12px/18px var(--lce-police-texte);
    }
    .action {
      display: inline-grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--lce-ink-muted);
      cursor: pointer;
    }
    .action:hover {
      background: var(--lce-adm-bg);
      color: var(--lce-ink);
    }
    .roles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .role-carte {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition:
        transform 180ms,
        box-shadow 180ms;
    }
    .role-carte:hover {
      transform: translateY(-2px);
      box-shadow: var(--adm-ombre-survol);
    }
    .role-carte .entre {
      margin-bottom: 8px;
    }
    .role-carte b {
      font: 800 17px/24px var(--lce-police-titre);
    }
    .modules {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    .modules span {
      padding: 2px 8px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-adm-bg);
      font: 600 11px/18px var(--lce-police-texte);
    }
    .formulaire {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    fieldset {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 0;
      padding: 14px 16px;
      border: 1px solid var(--adm-ligne);
      border-radius: 12px;
    }
    legend {
      padding: 0 6px;
      font: 800 12px/16px var(--lce-police-texte);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .permission {
      padding: 4px 0;
    }
    .supprimer {
      margin-right: auto;
      color: var(--lce-danger);
    }
  `,
})
export class Personnel {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);

  protected readonly ressource = httpResource<VuePersonnel>(() => `${API}/admin/personnel`);
  protected readonly vue = linkedSignal<VuePersonnel | undefined, VuePersonnel | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });
  protected readonly onglet = signal<'equipe' | 'roles'>('equipe');
  protected readonly moi = computed(() => this.session.profil()?.id ?? null);
  protected readonly peutRoles = computed(() => this.session.permissions().has('role.gerer'));

  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal(false);

  protected readonly membre = signal<{ id: string | null; nom: string } | null>(null);
  protected fm: FormulaireMembre = { nom: '', telephone: '', email: '', roleId: '', motDePasse: '', actif: true };

  protected readonly role = signal<Pick<RoleAdmin, 'id' | 'nom' | 'systeme' | 'verrouille' | 'membres'> | null>(null);
  protected nomRole = '';
  protected readonly coches = signal<ReadonlySet<string>>(new Set());
  protected readonly groupes = computed(() => {
    const permissions = this.vue()?.permissions ?? [];
    return Object.entries(MODULES)
      .map(([module, libelle]) => ({ module, libelle, permissions: permissions.filter((p) => p.module === module) }))
      .filter((g) => g.permissions.length);
  });

  protected ini(nom: string): string {
    return initiales(nom);
  }

  protected modulesDe(r: RoleAdmin): string[] {
    const permissions = this.vue()?.permissions ?? [];
    const modules = new Set(permissions.filter((p) => r.permissions.includes(p.code)).map((p) => p.module));
    return [...modules].map((m) => MODULES[m] ?? m);
  }

  protected ouvrirMembre(m: MembrePersonnel | null): void {
    this.erreur.set(null);
    const roles = this.vue()?.roles ?? [];
    this.fm = m
      ? { nom: m.nom, telephone: m.telephone ?? '', email: m.email ?? '', roleId: m.role.id, motDePasse: '', actif: m.actif }
      : { nom: '', telephone: '', email: '', roleId: roles.find((r) => !r.verrouille)?.id ?? roles[0]?.id ?? '', motDePasse: '', actif: true };
    this.membre.set({ id: m?.id ?? null, nom: m?.nom ?? '' });
  }

  protected async enregistrerMembre(): Promise<void> {
    const id = this.membre()?.id;
    const f = this.fm;
    const requete = id
      ? this.http.patch<VuePersonnel>(`${API}/admin/personnel/${id}`, {
          nom: f.nom,
          email: f.email || null,
          roleId: f.roleId,
          actif: f.actif,
          ...(f.motDePasse ? { motDePasse: f.motDePasse } : {}),
        })
      : this.http.post<VuePersonnel>(`${API}/admin/personnel`, { nom: f.nom, telephone: f.telephone, email: f.email || null, roleId: f.roleId, motDePasse: f.motDePasse });
    const vue = await envoyer(requete, this.erreur, this.envoi);
    if (vue) {
      this.vue.set(vue);
      this.membre.set(null);
    }
  }

  protected ouvrirRole(r: RoleAdmin | null): void {
    this.erreur.set(null);
    this.nomRole = r?.nom ?? '';
    this.coches.set(new Set(r?.permissions ?? ['tableau.voir']));
    this.role.set(r ?? { id: '', nom: '', systeme: false, verrouille: false, membres: 0 });
  }

  protected basculer(code: string): void {
    this.coches.update((s) => {
      const copie = new Set(s);
      if (copie.has(code)) copie.delete(code);
      else copie.add(code);
      return copie;
    });
  }

  protected async enregistrerRole(): Promise<void> {
    const r = this.role();
    if (!r || r.verrouille) return;
    const corps = { nom: this.nomRole || r.nom, permissions: [...this.coches()] };
    const requete = r.id ? this.http.patch<RoleAdmin[]>(`${API}/admin/roles/${r.id}`, corps) : this.http.post<RoleAdmin[]>(`${API}/admin/roles`, corps);
    const roles = await envoyer(requete, this.erreur, this.envoi);
    if (roles) {
      this.vue.update((v) => v && { ...v, roles });
      this.role.set(null);
    }
  }

  protected async supprimerRole(id: string): Promise<void> {
    if (!confirm('Supprimer ce rôle ?')) return;
    const fait = await envoyer(this.http.delete(`${API}/admin/roles/${id}`, { observe: 'response' }), this.erreur, this.envoi);
    if (fait) {
      this.vue.update((v) => v && { ...v, roles: v.roles.filter((r) => r.id !== id) });
      this.role.set(null);
    }
  }
}
