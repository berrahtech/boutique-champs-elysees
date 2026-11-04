import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CategoriePublique, EcritureProduit, ProduitAdminDetail } from '@lce/contrats';
import { API, Session, versErreurApi } from '@lce/session';
import { Bascule, Bouton, Icone, ICONES, NomIcone } from '@lce/ui';
import { firstValueFrom } from 'rxjs';

const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

/** Création et modification d'un produit (maquette « A-ProduitEdition »). */
@Component({
  selector: 'lce-produit-edition',
  imports: [FormsModule, RouterLink, Bascule, Bouton, Icone],
  templateUrl: './produit-edition.html',
  styles: `
    .titre-section {
      margin: 0;
      font: 700 15px/22px var(--lce-police-texte);
    }
    .formulaire {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .deux {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
    }
    .images {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }
    .image {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      overflow: hidden;
      border: 1px solid var(--adm-ligne);
      border-radius: 10px;
      background: var(--lce-surface-ivoire);
      color: var(--lce-gold-deep);
    }
    .image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .principale {
      position: absolute;
      top: 6px;
      left: 6px;
      padding: 2px 6px;
      border-radius: var(--lce-rayon-badge);
      background: var(--lce-navy);
      color: var(--lce-gold-bright);
      font: 600 9px/14px var(--lce-police-texte);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .retirer-image {
      position: absolute;
      top: 4px;
      right: 4px;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 50%;
      background: var(--lce-surface);
      color: var(--lce-danger);
      cursor: pointer;
    }
    .ajouter-image {
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 2px dashed #c9ced9;
      background: var(--lce-surface);
      color: var(--lce-ink-muted);
      font: 600 12px/16px var(--lce-police-texte);
      cursor: pointer;
    }
    .ajouter-image:focus-within {
      outline: 2px solid var(--lce-focus);
      outline-offset: 2px;
    }
    .caracteristique {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) 44px;
      gap: 8px;
    }
    .supprimer {
      display: grid;
      place-items: center;
      border: 0;
      background: none;
      color: var(--lce-ink-muted);
      cursor: pointer;
    }
    .supprimer:hover {
      color: var(--lce-danger);
    }
    .retirer-produit {
      color: var(--lce-danger);
      border-color: var(--lce-danger);
    }
    .ligne {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    p {
      margin: 0;
    }
  `,
})
export class ProduitEdition {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(Session);

  /** Absent sur /admin/produits/nouveau. */
  readonly id = input<string>();

  protected readonly creation = computed(() => !this.id());
  protected readonly peutModifier = computed(() => this.session.permissions().has('produit.modifier'));
  protected readonly icones = Object.keys(ICONES) as NomIcone[];

  private readonly ressourceCategories = httpResource<CategoriePublique[]>(() => `${API}/categories`);
  protected readonly categories = computed(() => (this.ressourceCategories.hasValue() ? this.ressourceCategories.value() : []));

  protected readonly ressource = httpResource<ProduitAdminDetail>(() => (this.id() ? `${API}/admin/produits/${this.id()}` : undefined));
  protected readonly enregistre = signal<ProduitAdminDetail | null>(null);
  protected readonly produit = computed(() => this.enregistre() ?? (this.ressource.hasValue() ? (this.ressource.value() ?? null) : null));

  protected nom = '';
  protected reference = '';
  protected categorieId = '';
  protected rayon = '';
  protected description = '';
  protected prix: number | null = null;
  protected prixBarre: number | null = null;
  protected seuilAlerte = 5;
  protected icone = 'sac';
  protected readonly nouveau = signal(false);
  protected readonly publie = signal(false);
  protected readonly caracteristiques = signal<{ cle: string; valeur: string }[]>([]);

  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);

  constructor() {
    effect(() => {
      const p = this.produit();
      if (p) this.remplir(p);
    });
  }

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  protected ajouterCaracteristique(): void {
    this.caracteristiques.update((l) => [...l, { cle: '', valeur: '' }]);
  }

  protected retirerCaracteristique(i: number): void {
    this.caracteristiques.update((l) => l.filter((_, j) => j !== i));
  }

  protected async enregistrer(): Promise<void> {
    if (!this.nom.trim() || !this.categorieId || !this.prix) {
      this.erreur.set('Renseignez au moins le nom, la catégorie et le prix.');
      this.succes.set(null);
      return;
    }
    const corps: EcritureProduit = {
      nom: this.nom,
      reference: this.reference.trim() || null,
      categorieId: this.categorieId,
      rayon: this.rayon,
      description: this.description,
      prix: this.prix,
      prixBarre: this.prixBarre || null,
      nouveau: this.nouveau(),
      publie: this.publie(),
      icone: this.icone,
      seuilAlerte: this.seuilAlerte,
      caracteristiques: this.caracteristiques()
        .filter((c) => c.cle.trim())
        .map((c) => [c.cle.trim(), c.valeur.trim()]),
    };
    await this.executer(async () => {
      if (this.creation()) {
        const cree = await firstValueFrom(this.http.post<ProduitAdminDetail>(`${API}/admin/produits`, corps));
        await this.router.navigate(['/admin/produits', cree.id]);
      } else {
        this.enregistre.set(await firstValueFrom(this.http.patch<ProduitAdminDetail>(`${API}/admin/produits/${this.id()}`, corps)));
        this.succes.set('Produit enregistré.');
      }
    });
  }

  protected async televerser(evenement: Event): Promise<void> {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX_IMAGE) {
      this.erreur.set('Cette image dépasse 5 Mo.');
      return;
    }
    const donnees = new FormData();
    donnees.append('image', fichier);
    await this.executer(async () => {
      const p = await firstValueFrom(this.http.post<ProduitAdminDetail>(`${API}/admin/produits/${this.id()}/images`, donnees));
      this.enregistre.set(p);
      this.succes.set('Photo ajoutée et optimisée.');
    });
  }

  protected async supprimerImage(imageId: string): Promise<void> {
    await this.executer(async () => {
      this.enregistre.set(await firstValueFrom(this.http.delete<ProduitAdminDetail>(`${API}/admin/produits/${this.id()}/images/${imageId}`)));
    });
  }

  protected async retirer(): Promise<void> {
    if (!confirm('Retirer ce produit du catalogue ? Il restera visible dans les anciennes commandes.')) return;
    await this.executer(async () => {
      await firstValueFrom(this.http.delete(`${API}/admin/produits/${this.id()}`));
      await this.router.navigateByUrl('/admin/produits');
    });
  }

  private remplir(p: ProduitAdminDetail): void {
    this.nom = p.nom;
    this.reference = p.reference ?? '';
    this.categorieId = p.categorie.id;
    this.rayon = p.rayon;
    this.description = p.description;
    this.prix = p.prix;
    this.prixBarre = p.prixBarre;
    this.seuilAlerte = p.seuilAlerte;
    this.icone = p.icone ?? 'sac';
    this.nouveau.set(p.nouveau);
    this.publie.set(p.publie);
    this.caracteristiques.set(p.caracteristiques.map(([cle, valeur]) => ({ cle, valeur })));
  }

  private async executer(action: () => Promise<void>): Promise<void> {
    this.erreur.set(null);
    this.succes.set(null);
    this.envoi.set(true);
    try {
      await action();
    } catch (e) {
      this.erreur.set(versErreurApi(e).messageUtilisateur);
    } finally {
      this.envoi.set(false);
    }
  }
}
