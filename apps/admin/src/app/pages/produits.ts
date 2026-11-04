import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CategoriePublique, EtatStock, ListeProduitsAdmin, ProduitAdmin } from '@lce/contrats';
import { API, Session, versErreurApi } from '@lce/session';
import { Bouton, FcfaPipe, Icone, NomIcone } from '@lce/ui';
import { firstValueFrom } from 'rxjs';

/** Tableau des produits (maquette « A-Produits »). */
@Component({
  selector: 'lce-produits',
  imports: [FormsModule, RouterLink, Bouton, FcfaPipe, Icone],
  templateUrl: './produits.html',
  styles: `
    .recherche {
      flex: 1 1 300px;
      max-width: 400px;
    }
    .bascule {
      position: relative;
      flex: none;
      width: 40px;
      height: 22px;
      border: 0;
      border-radius: var(--lce-rayon-pastille);
      background: #c9ced9;
      cursor: pointer;
    }
    .bascule::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--lce-surface);
      transition: left 150ms;
    }
    .bascule[aria-checked='true'] {
      background: var(--lce-success);
    }
    .bascule[aria-checked='true']::after {
      left: 21px;
    }
    .rupture {
      color: var(--lce-danger);
    }
    .sous-seuil {
      color: var(--lce-navy-500);
    }
    .promo {
      color: var(--lce-promo);
    }
    .brouillon {
      opacity: 0.65;
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
  private minuteur?: ReturnType<typeof setTimeout>;

  protected readonly peutModifier = computed(() => this.session.permissions().has('produit.modifier'));

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
    computation: (valeur, precedent) => valeur ?? precedent?.value,
  });

  constructor() {
    effect(() => {
      const q = this.q() ?? '';
      this.recherche = q;
      this.requete.set(q);
      this.page.set(1);
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

  protected async basculerPublication(p: ProduitAdmin): Promise<void> {
    this.erreur.set(null);
    try {
      await firstValueFrom(this.http.patch(`${API}/admin/produits/${p.id}`, { publie: !p.publie }));
      this.ressource.reload();
    } catch (e) {
      this.erreur.set(versErreurApi(e).messageUtilisateur);
    }
  }
}
