import { HttpClient, httpResource } from '@angular/common/http';
import { Component, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EcritureZone, ZoneAdmin } from '@lce/contrats';
import { API } from '@lce/session';
import { Bouton, FcfaPipe, Icone } from '@lce/ui';
import { Panneau } from '../composants/panneau';
import { envoyer } from '../outils';

const VIDE: EcritureZone = { nom: '', frais: 1000, delaiHeures: 24, seuilGratuit: null, actif: true };

/** Zones de livraison et tarifs (maquette « A-Zones »). */
@Component({
  selector: 'lce-zones',
  imports: [FormsModule, Bouton, FcfaPipe, Icone, Panneau],
  template: `
    <div class="adm-corps">
      <div class="adm-titre">
        <div class="empile">
          <h1>Zones et tarifs</h1>
          <span class="attenue petit">Frais et délai affichés au client selon son quartier.</span>
        </div>
        <button lceBouton type="button" (click)="ouvrir(null)"><lce-icone nom="plus" [taille]="18" />Nouvelle zone</button>
      </div>

      @if (zones(); as liste) {
        <div class="grille">
          @for (z of liste; track z.id) {
            <button type="button" class="carte zone" [class.inactive]="!z.actif" (click)="ouvrir(z)">
              <span class="entre">
                <span class="icone-teinte" [class.vert]="z.actif"><lce-icone nom="zones" [taille]="22" /></span>
                <span class="etat" [class.normal]="z.actif" [class.brouillon]="!z.actif">{{ z.actif ? 'Desservie' : 'Suspendue' }}</span>
              </span>
              <b class="nom">{{ z.nom }}</b>
              <span class="prix chiffres">{{ z.frais | fcfa }}</span>
              <span class="details petit attenue">
                <span><lce-icone nom="horloge" [taille]="14" />{{ delai(z.delaiHeures) }}</span>
                <span><lce-icone nom="cadeau" [taille]="14" />{{ z.seuilGratuit !== null ? 'Offerte dès ' + (z.seuilGratuit | fcfa) : 'Jamais offerte' }}</span>
                <span><lce-icone nom="livraison" [taille]="14" />{{ z.livreurs }} livreur{{ z.livreurs > 1 ? 's' : '' }} · {{ z.commandes }} commande{{ z.commandes > 1 ? 's' : '' }}</span>
              </span>
            </button>
          } @empty {
            <div class="carte vide attenue">Aucune zone : créez la première pour ouvrir les commandes.</div>
          }
        </div>
      } @else if (ressource.error()) {
        <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />Impossible de charger les zones.</p>
      } @else {
        <div class="grille">
          @for (n of [1, 2, 3]; track n) {
            <span class="carte squelette" style="height: 196px"></span>
          }
        </div>
      }
    </div>

    @if (edition(); as e) {
      <lce-panneau [titre]="e.id ? 'Modifier la zone' : 'Nouvelle zone'" (fermer)="edition.set(null)">
        <form id="form-zone" class="formulaire" (ngSubmit)="enregistrer()">
          <div class="champ"><label for="z-nom">Nom</label><input id="z-nom" name="nom" class="saisie" placeholder="Bamako – Commune III" required [(ngModel)]="formulaire.nom" /></div>
          <div class="deux">
            <div class="champ"><label for="z-frais">Frais (FCFA)</label><input id="z-frais" name="frais" class="saisie" type="number" min="0" step="100" [(ngModel)]="formulaire.frais" /></div>
            <div class="champ"><label for="z-delai">Délai (heures)</label><input id="z-delai" name="delai" class="saisie" type="number" min="1" [(ngModel)]="formulaire.delaiHeures" /></div>
          </div>
          <div class="champ">
            <label for="z-seuil">Livraison offerte dès (FCFA)</label>
            <input id="z-seuil" name="seuil" class="saisie" type="number" min="0" step="1000" placeholder="Laisser vide : jamais offerte" [(ngModel)]="formulaire.seuilGratuit" />
          </div>
          <label class="case"><input type="checkbox" name="actif" [(ngModel)]="formulaire.actif" />Zone desservie (proposée aux clients)</label>
          @if (erreur()) {
            <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
          }
        </form>
        <ng-container pied>
          <button lceBouton variante="clair" type="button" (click)="edition.set(null)">Annuler</button>
          <button lceBouton type="submit" form="form-zone" [disabled]="envoi()">{{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </ng-container>
      </lce-panneau>
    }
  `,
  styles: `
    .grille {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .zone {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;
      font: inherit;
      color: inherit;
      cursor: pointer;
      transition:
        transform 180ms,
        box-shadow 180ms;
    }
    .zone:hover {
      transform: translateY(-2px);
      box-shadow: var(--adm-ombre-survol);
    }
    .zone.inactive {
      opacity: 0.6;
    }
    .zone .entre {
      margin-bottom: 8px;
    }
    .nom {
      font: 800 17px/24px var(--lce-police-titre);
    }
    .prix {
      font: 800 24px/30px var(--lce-police-titre);
    }
    .details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--adm-ligne);
    }
    .details span {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .vide {
      grid-column: 1 / -1;
      padding: 40px;
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
  `,
})
export class Zones {
  private readonly http = inject(HttpClient);

  protected readonly ressource = httpResource<ZoneAdmin[]>(() => `${API}/admin/zones`);
  protected readonly zones = linkedSignal<ZoneAdmin[] | undefined, ZoneAdmin[] | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });
  protected readonly edition = signal<{ id: string | null } | null>(null);
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected formulaire: EcritureZone = { ...VIDE };

  protected delai(heures: number): string {
    return heures < 48 ? `${heures} h` : `${Math.round(heures / 24)} jours`;
  }

  protected ouvrir(z: ZoneAdmin | null): void {
    this.erreur.set(null);
    this.formulaire = z ? { nom: z.nom, frais: z.frais, delaiHeures: z.delaiHeures, seuilGratuit: z.seuilGratuit, actif: z.actif } : { ...VIDE };
    this.edition.set({ id: z?.id ?? null });
  }

  protected async enregistrer(): Promise<void> {
    const id = this.edition()?.id;
    const f = this.formulaire;
    const corps: EcritureZone = {
      ...f,
      frais: Number(f.frais) || 0,
      delaiHeures: Number(f.delaiHeures) || 0,
      seuilGratuit: f.seuilGratuit === null || (f.seuilGratuit as unknown) === '' ? null : Number(f.seuilGratuit),
    };
    const requete = id ? this.http.patch<ZoneAdmin[]>(`${API}/admin/zones/${id}`, corps) : this.http.post<ZoneAdmin[]>(`${API}/admin/zones`, corps);
    const zones = await envoyer(requete, this.erreur, this.envoi);
    if (zones) {
      this.zones.set(zones);
      this.edition.set(null);
    }
  }
}
