import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CategoriePublique, EtatStock, ListeProduitsAdmin, ProduitAdmin } from '@lce/contrats';
import { API, Session, versErreurApi } from '@lce/session';
import { Bouton, FcfaPipe, Icone, NomIcone } from '@lce/ui';
import { firstValueFrom } from 'rxjs';

/** Première page sans filtre, gardée entre deux visites : le tableau s'affiche aussitôt. */
let listeMemorisee: ListeProduitsAdmin | undefined;

/** Tableau des produits (maquette « A-Produits »). */
@Component({
  selector: 'lce-produits',
  imports: [FormsModule, RouterLink, Bouton, FcfaPipe, Icone],
  templateUrl: './produits.html',
  styles: `
    .filtres {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--adm-ligne);
      border-radius: var(--adm-rayon);
      background: var(--lce-surface);
      box-shadow: var(--adm-ombre);
    }
    .recherche {
      flex: 1 1 280px;
    }
    .filtres select {
      flex: 0 1 200px;
    }
    .tableau {
      min-width: 760px;
    }
    .stock {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .bascule {
      position: relative;
      flex: none;
      width: 42px;
      height: 24px;
      border: 0;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-line-fort);
      cursor: pointer;
      transition: background-color 180ms;
    }
    .bascule::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--lce-surface);
      box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
      transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .bascule[aria-checked='true'] {
      background: var(--lce-success);
    }
    .bascule[aria-checked='true']::after {
      transform: translateX(18px);
    }
    .bascule:disabled {
      cursor: default;
      opacity: 0.7;
    }
    .brouillon .produit-cellule {
      opacity: 0.55;
    }
    .action {
      display: inline-grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      color: var(--lce-ink-muted);
      transition:
        background-color 150ms,
        color 150ms;
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
      padding: 48px 16px;
      text-align: center;
    }
    .aucun .icone-teinte {
      margin-bottom: 6px;
    }
    .pagination {
      display: inline-flex;
      align-items: center;
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
      color: var(--lce-ink);
      cursor: pointer;
    }
    .pagination button:hover:not(:disabled) {
      border-color: var(--lce-ink);
    }
    .pagination button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    @media (max-width: 767px) {
      .filtres select {
        flex: 1 1 140px;
      }
    }
  `,
})
export class Produits {
  private readonly http = inject(HttpClient);
  protected readonly session = inject(Session);

  /** Recherche venue de la barre supérieure (?q=). */
  readonly q = input<string>();

  protected recherche = '';
  protected readonly requete = signal('');
  protected readonly categorieId = signal('');
  protected readonly publication = signal('');
  protected readonly etatStock = signal<EtatStock | ''>('');
  protected readonly page = signal(1);
  protected readonly erreur = signal<string | null>(null);
  /** Produits dont la publication est en cours d'envoi. */
  protected readonly bascules = signal<ReadonlySet<string>>(new Set());
  protected readonly lignesSquelette = [1, 2, 3, 4, 5, 6, 7, 8];
  private minuteur?: ReturnType<typeof setTimeout>;

  protected readonly peutModifier = computed(() => this.session.permissions().has('produit.modifier'));
  private readonly sansFiltre = computed(
    () => !this.requete() && !this.categorieId() && !this.publication() && !this.etatStock() && this.page() === 1,
  );

  private readonly ressourceCategories = httpResource<CategoriePublique[]>(() => `${API}/categories`);
  protected readonly categories = computed(() => (this.ressourceCategories.hasValue() ? this.ressourceCategories.value() : []));

  protected readonly ressource = httpResource<ListeProduitsAdmin>(() => {
    const params: Record<string, string | number> = { page: this.page() };
    if (this.requete()) params['q'] = this.requete();
    if (this.categorieId()) params['categorieId'] = this.categorieId();
    if (this.publication()) params['publication'] = this.publication();
    if (this.etatStock()) params['stock'] = this.etatStock();
    return { url: `${API}/admin/produits`, params };
  });
  protected readonly liste = linkedSignal<ListeProduitsAdmin | undefined, ListeProduitsAdmin | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (valeur, precedent) => valeur ?? precedent?.value ?? (this.sansFiltre() ? listeMemorisee : undefined),
  });

  constructor() {
    effect(() => {
      const q = this.q() ?? '';
      this.recherche = q;
      this.requete.set(q);
      this.page.set(1);
    });
    effect(() => {
      if (this.ressource.hasValue() && this.sansFiltre()) listeMemorisee = this.ressource.value();
    });
  }

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  /** Attend la fin de la frappe avant d'interroger le serveur. */
  protected saisirRecherche(valeur: string): void {
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => {
      this.requete.set(valeur.trim());
      this.page.set(1);
    }, 300);
  }

  protected changerFiltre(filtre: { set(v: never): void }, valeur: string): void {
    filtre.set(valeur as never);
    this.page.set(1);
  }

  /** La bascule change tout de suite ; elle revient en arrière si le serveur refuse. */
  protected async basculerPublication(p: ProduitAdmin): Promise<void> {
    this.erreur.set(null);
    this.bascules.update((s) => new Set(s).add(p.id));
    this.marquerPublie(p.id, !p.publie);
    try {
      await firstValueFrom(this.http.patch(`${API}/admin/produits/${p.id}`, { publie: !p.publie }));
      this.ressource.reload();
    } catch (e) {
      this.marquerPublie(p.id, p.publie);
      this.erreur.set(versErreurApi(e).messageUtilisateur);
    } finally {
      this.bascules.update((s) => {
        const copie = new Set(s);
        copie.delete(p.id);
        return copie;
      });
    }
  }

  private marquerPublie(id: string, publie: boolean): void {
    this.liste.update((l) => l && { ...l, produits: l.produits.map((x) => (x.id === id ? { ...x, publie } : x)) });
  }
}
