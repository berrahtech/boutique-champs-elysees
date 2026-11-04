import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import type { Filtre, ResultatsCatalogue, Tri } from '@lce/contrats';
import { API } from '@lce/session';
import { Bouton, Icone } from '@lce/ui';
import { Cartes } from '../composants/cartes';
import { ErreurChargement, Squelettes } from '../composants/etats';
import { Catalogue } from '../donnees/catalogue';
import { titreDePage } from '../titres';

export type ModeListe = 'boutique' | 'categorie' | 'promotions' | 'recherche';

const PAR_PAGE = 12;

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: 'tout', libelle: 'Tout' },
  { valeur: 'promotions', libelle: 'Promos' },
  { valeur: 'nouveautes', libelle: 'Nouveautés' },
  { valeur: 'meilleures-ventes', libelle: 'Meilleures ventes' },
  { valeur: 'petits-prix', libelle: 'Petits prix' },
];

const TRIS: { valeur: Tri; libelle: string }[] = [
  { valeur: 'popularite', libelle: 'Popularité' },
  { valeur: 'nouveautes', libelle: 'Nouveautés' },
  { valeur: 'prix-croissant', libelle: 'Prix croissant' },
  { valeur: 'prix-decroissant', libelle: 'Prix décroissant' },
];

const entierOuNul = (v: unknown) => (v == null || v === '' ? undefined : numberAttribute(v));

/**
 * Liste de produits (maquettes « Boutique », « Catégorie », « Promotions », « Recherche »).
 * Tous les critères sont dans l'URL : une recherche filtrée se partage telle quelle.
 */
@Component({
  selector: 'lce-liste',
  imports: [FormsModule, RouterLink, Bouton, Cartes, ErreurChargement, Icone, Squelettes],
  templateUrl: './liste.html',
  styleUrl: './liste.scss',
})
export class Liste {
  private readonly catalogue = inject(Catalogue);
  private readonly router = inject(Router);
  private readonly titre = inject(Title);

  // Paramètres de route et de requête (liés par withComponentInputBinding).
  readonly mode = input<ModeListe>('boutique');
  readonly slug = input<string>();
  readonly q = input<string>();
  readonly filtre = input<Filtre>();
  readonly tri = input<Tri>();
  readonly page = input(1, { transform: (v: unknown) => entierOuNul(v) ?? 1 });
  readonly min = input(undefined, { transform: entierOuNul });
  readonly max = input(undefined, { transform: entierOuNul });
  readonly stock = input(false, { transform: (v: unknown) => v === '1' || v === true });

  protected readonly filtres = FILTRES;
  protected readonly tris = TRIS;
  protected readonly categories = this.catalogue.categories;
  protected readonly filtresOuverts = signal(false);
  protected prixMin: number | null = null;
  protected prixMax: number | null = null;

  protected readonly categorie = computed(() => (this.slug() ? this.catalogue.categorie(this.slug()!) : undefined));
  protected readonly filtreActif = computed<Filtre>(() => (this.mode() === 'promotions' ? 'promotions' : (this.filtre() ?? 'tout')));

  protected readonly ressource = httpResource<ResultatsCatalogue>(() => {
    const params: Record<string, string | number> = { parPage: PAR_PAGE, page: this.page() };
    if (this.slug()) params['categorie'] = this.slug()!;
    if (this.q()) params['q'] = this.q()!;
    if (this.filtreActif() !== 'tout') params['filtre'] = this.filtreActif();
    if (this.tri()) params['tri'] = this.tri()!;
    if (this.min() != null) params['min'] = this.min()!;
    if (this.max() != null) params['max'] = this.max()!;
    if (this.stock()) params['enStock'] = '1';
    return { url: `${API}/produits`, params };
  });

  /** Derniers résultats : la liste reste affichée pendant le chargement de la suivante. */
  protected readonly resultats = linkedSignal<ResultatsCatalogue | undefined, ResultatsCatalogue | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (valeur, precedent) => valeur ?? precedent?.value,
  });
  protected readonly erreur = computed(() => this.ressource.status() === 'error');
  protected readonly chargement = computed(() => this.ressource.isLoading());

  protected readonly intitule = computed(() => {
    switch (this.mode()) {
      case 'categorie':
        return this.categorie()?.nom ?? 'Catégorie';
      case 'promotions':
        return 'Promotions';
      case 'recherche':
        return this.q() ? `Résultats pour « ${this.q()} »` : 'Recherche';
      default:
        return 'Toute la boutique';
    }
  });


  /** Pages affichées : la première, la dernière et les voisines de la page courante. */
  protected readonly numerosDePage = computed(() => {
    const { page, pages } = this.resultats() ?? { page: 1, pages: 1 };
    const garder = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
    const triees = [...garder].sort((a, b) => a - b);
    return triees.flatMap((n, i) => (i > 0 && n - triees[i - 1] > 1 ? ['…', n] : [n]));
  });

  protected readonly filtresAppliques = computed(() => this.min() != null || this.max() != null || this.stock());

  constructor() {
    effect(() => {
      this.titre.setTitle(titreDePage(this.intitule()));
      this.prixMin = this.min() ?? null;
      this.prixMax = this.max() ?? null;
    });
  }

  /** Lien vers la même liste avec des paramètres changés (et retour en page 1). */
  protected avec(changements: Record<string, string | number | null>): Record<string, string | number | null> {
    return { page: null, ...changements };
  }

  protected changerTri(tri: string): void {
    void this.router.navigate([], { queryParams: { tri: tri === 'popularite' ? null : tri, page: null }, queryParamsHandling: 'merge' });
  }

  protected appliquerPrix(): void {
    void this.router.navigate([], {
      queryParams: { min: this.prixMin || null, max: this.prixMax || null, page: null },
      queryParamsHandling: 'merge',
    });
    this.filtresOuverts.set(false);
  }

  protected basculerStock(): void {
    void this.router.navigate([], { queryParams: { stock: this.stock() ? null : 1, page: null }, queryParamsHandling: 'merge' });
  }

  protected toutEffacer(): void {
    void this.router.navigate([], { queryParams: { q: this.q() ?? null } });
    this.filtresOuverts.set(false);
  }

  protected estNumero(n: number | string): n is number {
    return typeof n === 'number';
  }
}
