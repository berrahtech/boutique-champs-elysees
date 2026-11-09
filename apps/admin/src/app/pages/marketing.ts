import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CategoriePublique, CodePromoAdmin, EcritureCodePromo, TypeRemise } from '@lce/contrats';
import { API } from '@lce/session';
import { Bouton, FcfaPipe, Icone } from '@lce/ui';
import { Panneau } from '../composants/panneau';
import { envoyer, versChampDate } from '../outils';

const ETATS: Record<CodePromoAdmin['etat'], { libelle: string; classe: string }> = {
  actif: { libelle: 'Actif', classe: 'normal' },
  programme: { libelle: 'Programmé', classe: 'sous-seuil' },
  expire: { libelle: 'Expiré', classe: 'brouillon' },
  epuise: { libelle: 'Épuisé', classe: 'rupture' },
  desactive: { libelle: 'Désactivé', classe: 'brouillon' },
};

interface Formulaire {
  code: string;
  type: TypeRemise;
  valeur: number;
  categorieId: string;
  montantMinimum: number;
  debut: string;
  fin: string;
  utilisationsMax: number | null;
  actif: boolean;
}

function vide(): Formulaire {
  const debut = new Date();
  const fin = new Date(debut.getTime() + 30 * 86_400_000);
  return { code: '', type: 'POURCENTAGE', valeur: 10, categorieId: '', montantMinimum: 0, debut: versChampDate(debut.toISOString()), fin: versChampDate(fin.toISOString()), utilisationsMax: null, actif: true };
}

/** Codes promo (maquette « A-Marketing »). */
@Component({
  selector: 'lce-marketing',
  imports: [DatePipe, FormsModule, Bouton, FcfaPipe, Icone, Panneau],
  template: `
    <div class="adm-corps">
      <div class="adm-titre">
        <div class="empile">
          <h1>Marketing</h1>
          <span class="attenue petit">Codes promo saisis par les clients dans leur panier.</span>
        </div>
        <button lceBouton type="button" (click)="ouvrir(null)"><lce-icone nom="plus" [taille]="18" />Nouveau code</button>
      </div>

      @if (codes(); as liste) {
        <div class="indicateurs">
          <div class="indicateur"><span class="icone-teinte vert"><lce-icone nom="pourcentage" [taille]="22" /></span><span class="l">Codes actifs</span><span class="v">{{ nbActifs() }}</span></div>
          <div class="indicateur"><span class="icone-teinte or"><lce-icone nom="etiquette" [taille]="22" /></span><span class="l">Utilisations</span><span class="v">{{ utilisations() }}</span></div>
          <div class="indicateur"><span class="icone-teinte"><lce-icone nom="calendrier" [taille]="22" /></span><span class="l">Programmés</span><span class="v">{{ nbProgrammes() }}</span></div>
        </div>

        <div class="tableau-cadre">
          <table class="tableau">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Remise</th>
                <th scope="col">Conditions</th>
                <th scope="col">Période</th>
                <th scope="col">Utilisations</th>
                <th scope="col">État</th>
                <th scope="col"><span class="lce-visuellement-masque">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (c of liste; track c.id) {
                <tr>
                  <td><span class="code">{{ c.code }}</span></td>
                  <td><b>{{ remise(c) }}</b></td>
                  <td class="petit">
                    {{ c.categorie ? c.categorie.nom : 'Tout le catalogue' }}
                    @if (c.montantMinimum) {
                      <br /><span class="attenue">Dès {{ c.montantMinimum | fcfa }}</span>
                    }
                  </td>
                  <td class="petit chiffres">{{ c.debut | date: 'd MMM' }} → {{ c.fin | date: 'd MMM yyyy' }}</td>
                  <td>
                    <span class="usage chiffres">
                      <b>{{ c.utilisations }}</b><small> / {{ c.utilisationsMax ?? '∞' }}</small>
                    </span>
                    @if (c.utilisationsMax) {
                      <span class="jauge"><span [style.width.%]="(c.utilisations / c.utilisationsMax) * 100"></span></span>
                    }
                  </td>
                  <td><span class="etat" [class]="etats[c.etat].classe">{{ etats[c.etat].libelle }}</span></td>
                  <td class="a-droite">
                    <button type="button" class="action" [attr.aria-label]="'Modifier ' + c.code" (click)="ouvrir(c)"><lce-icone nom="chevron-droite" [taille]="18" /></button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7">
                    <div class="aucun">
                      <span class="icone-teinte or"><lce-icone nom="pourcentage" [taille]="22" /></span>
                      <b>Aucun code promo</b>
                      <span class="petit attenue">Créez un code pour une opération : fête, lancement, fidélité…</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (ressource.error()) {
        <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />Impossible de charger les codes promo.</p>
      } @else {
        <span class="squelette" style="height: 320px; border-radius: 16px"></span>
      }
    </div>

    @if (edition(); as e) {
      <lce-panneau [titre]="e.id ? 'Modifier le code' : 'Nouveau code promo'" [sousTitre]="e.id ? 'Déjà utilisé ' + e.utilisations + ' fois' : ''" (fermer)="edition.set(null)">
        <form id="form-promo" class="formulaire" (ngSubmit)="enregistrer()">
          <div class="champ">
            <label for="p-code">Code</label>
            <input id="p-code" name="code" class="saisie code-saisie" placeholder="TABASKI10" maxlength="30" [(ngModel)]="formulaire.code" />
          </div>
          <div class="champ">
            <span class="libelle">Type de remise</span>
            <div class="types" role="radiogroup" aria-label="Type de remise">
              @for (t of types; track t.id) {
                <label class="type" [class.on]="formulaire.type === t.id">
                  <input type="radio" name="type" [value]="t.id" [(ngModel)]="formulaire.type" />
                  <lce-icone [nom]="t.icone" [taille]="20" />{{ t.libelle }}
                </label>
              }
            </div>
          </div>
          @if (formulaire.type !== 'LIVRAISON_OFFERTE') {
            <div class="champ">
              <label for="p-valeur">{{ formulaire.type === 'POURCENTAGE' ? 'Pourcentage' : 'Montant (FCFA)' }}</label>
              <input id="p-valeur" name="valeur" class="saisie" type="number" min="1" [max]="formulaire.type === 'POURCENTAGE' ? 100 : null" [(ngModel)]="formulaire.valeur" />
            </div>
          }
          <div class="deux">
            <div class="champ"><label for="p-debut">Début</label><input id="p-debut" name="debut" class="saisie" type="date" [(ngModel)]="formulaire.debut" /></div>
            <div class="champ"><label for="p-fin">Fin</label><input id="p-fin" name="fin" class="saisie" type="date" [(ngModel)]="formulaire.fin" /></div>
          </div>
          <div class="champ">
            <label for="p-cat">Catégorie concernée</label>
            <select id="p-cat" name="categorie" class="saisie" [(ngModel)]="formulaire.categorieId">
              <option value="">Tout le catalogue</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.nom }}</option>
              }
            </select>
          </div>
          <div class="deux">
            <div class="champ"><label for="p-min">Achat minimum (FCFA)</label><input id="p-min" name="min" class="saisie" type="number" min="0" step="1000" [(ngModel)]="formulaire.montantMinimum" /></div>
            <div class="champ"><label for="p-max">Utilisations max</label><input id="p-max" name="max" class="saisie" type="number" min="1" placeholder="Illimité" [(ngModel)]="formulaire.utilisationsMax" /></div>
          </div>
          <label class="case"><input type="checkbox" name="actif" [(ngModel)]="formulaire.actif" />Code actif</label>
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
        </form>
        <ng-container pied>
          <button lceBouton variante="clair" type="button" (click)="edition.set(null)">Annuler</button>
          <button lceBouton type="submit" form="form-promo" [disabled]="envoi()">{{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </ng-container>
      </lce-panneau>
    }
  `,
  styles: `
    .tableau {
      min-width: 820px;
    }
    .code {
      display: inline-block;
      padding: 4px 10px;
      border: 1px dashed var(--lce-gold-deep);
      border-radius: 8px;
      background: var(--lce-gold-soft);
      color: var(--lce-gold-text);
      font: 800 13px/18px ui-monospace, monospace;
      letter-spacing: 0.06em;
    }
    .usage small {
      color: var(--lce-ink-muted);
    }
    .jauge {
      display: block;
      width: 90px;
      height: 5px;
      margin-top: 6px;
      overflow: hidden;
      border-radius: 3px;
      background: var(--lce-neutre-soft);
    }
    .jauge span {
      display: block;
      height: 100%;
      background: var(--lce-gold);
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
    .aucun {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 40px 16px;
      text-align: center;
    }
    .formulaire {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .deux {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .code-saisie {
      font: 800 16px/24px ui-monospace, monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .libelle {
      font: 700 13px/20px var(--lce-police-texte);
    }
    .types {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .type {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 6px;
      border: 1.5px solid var(--adm-ligne);
      border-radius: 12px;
      font: 700 12px/16px var(--lce-police-texte);
      text-align: center;
      cursor: pointer;
      transition:
        border-color 150ms,
        background-color 150ms;
    }
    .type input {
      position: absolute;
      opacity: 0;
    }
    .type.on {
      border-color: var(--lce-navy);
      background: var(--lce-adm-bg);
    }
    .type:focus-within {
      outline: 2px solid var(--lce-focus);
    }
  `,
})
export class Marketing {
  private readonly http = inject(HttpClient);

  protected readonly ressource = httpResource<CodePromoAdmin[]>(() => `${API}/admin/promos`);
  protected readonly codes = linkedSignal<CodePromoAdmin[] | undefined, CodePromoAdmin[] | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });
  private readonly ressourceCategories = httpResource<CategoriePublique[]>(() => `${API}/categories`);
  protected readonly categories = computed(() => (this.ressourceCategories.hasValue() ? this.ressourceCategories.value() : []));

  protected readonly nbActifs = computed(() => this.codes()?.filter((c) => c.etat === 'actif').length ?? 0);
  protected readonly nbProgrammes = computed(() => this.codes()?.filter((c) => c.etat === 'programme').length ?? 0);
  protected readonly utilisations = computed(() => this.codes()?.reduce((n, c) => n + c.utilisations, 0) ?? 0);

  protected readonly etats = ETATS;
  protected readonly types = [
    { id: 'POURCENTAGE' as const, libelle: 'Pourcentage', icone: 'pourcentage' as const },
    { id: 'MONTANT_FIXE' as const, libelle: 'Montant fixe', icone: 'especes' as const },
    { id: 'LIVRAISON_OFFERTE' as const, libelle: 'Livraison offerte', icone: 'livraison' as const },
  ];

  protected readonly edition = signal<{ id: string | null; utilisations: number } | null>(null);
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected formulaire: Formulaire = vide();

  protected remise(c: CodePromoAdmin): string {
    if (c.type === 'LIVRAISON_OFFERTE') return 'Livraison offerte';
    return c.type === 'POURCENTAGE' ? `−${c.valeur} %` : `−${c.valeur.toLocaleString('fr-FR')} FCFA`;
  }

  protected ouvrir(c: CodePromoAdmin | null): void {
    this.erreur.set(null);
    this.formulaire = c
      ? {
          code: c.code,
          type: c.type,
          valeur: c.valeur,
          categorieId: c.categorie?.id ?? '',
          montantMinimum: c.montantMinimum,
          debut: versChampDate(c.debut),
          fin: versChampDate(c.fin),
          utilisationsMax: c.utilisationsMax,
          actif: c.actif,
        }
      : vide();
    this.edition.set({ id: c?.id ?? null, utilisations: c?.utilisations ?? 0 });
  }

  protected async enregistrer(): Promise<void> {
    const f = this.formulaire;
    const max = f.utilisationsMax as unknown;
    const corps: EcritureCodePromo = {
      code: f.code.trim().toUpperCase(),
      type: f.type,
      valeur: f.type === 'LIVRAISON_OFFERTE' ? 0 : Number(f.valeur) || 0,
      categorieId: f.categorieId || null,
      montantMinimum: Number(f.montantMinimum) || 0,
      debut: new Date(`${f.debut}T00:00:00Z`).toISOString(),
      // La fin englobe toute la dernière journée.
      fin: new Date(`${f.fin}T23:59:59Z`).toISOString(),
      utilisationsMax: max === null || max === '' ? null : Number(max),
      actif: f.actif,
    };
    const id = this.edition()?.id;
    const requete = id ? this.http.patch<CodePromoAdmin[]>(`${API}/admin/promos/${id}`, corps) : this.http.post<CodePromoAdmin[]>(`${API}/admin/promos`, corps);
    const codes = await envoyer(requete, this.erreur, this.envoi);
    if (codes) {
      this.codes.set(codes);
      this.edition.set(null);
    }
  }
}
