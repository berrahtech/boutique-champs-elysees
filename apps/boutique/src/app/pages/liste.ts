import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Bouton, Icone } from '@lce/ui';
import { Cartes } from '../composants/cartes';
import { Catalogue, Criteres, Filtre, PAR_PAGE, SEUIL_PETITS_PRIX, Tri } from '../donnees/catalogue';
import { titreDePage } from '../titres';

export type ModeListe = 'boutique' | 'categorie' | 'promotions' | 'recherche';

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: 'tout', libelle: 'Tout' },
  { valeur: 'promotions', libelle: 'En promotion' },
  { valeur: 'nouveautes', libelle: 'Nouveautés' },
  { valeur: 'meilleures-ventes', libelle: 'Meilleures ventes' },
  { valeur: 'petits-prix', libelle: 'Moins de 20 000 FCFA' },
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
  imports: [FormsModule, RouterLink, Bouton, Cartes, Icone],
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

  protected readonly criteres = computed<Criteres>(() => ({
    categorie: this.slug(),
    recherche: this.q(),
    filtre: this.filtreActif(),
    prixMin: this.min(),
    prixMax: this.max(),
    enStock: this.stock(),
    tri: this.tri(),
    page: this.page(),
  }));
  protected readonly resultats = computed(() => this.catalogue.rechercher(this.criteres()));

  protected readonly intitule = computed(() => {
    switch (this.mode()) {
      case 'categorie':
        return this.categorie()?.nom ?? 'Catégorie introuvable';
      case 'promotions':
        return 'Promotions';
      case 'recherche':
        return this.q() ? `Résultats pour « ${this.q()} »` : 'Recherche';
      default:
        return 'Toute la boutique';
    }
  });

  protected readonly bornes = computed(() => {
    const { page, total } = this.resultats();
    return total ? `${(page - 1) * PAR_PAGE + 1}–${Math.min(page * PAR_PAGE, total)}` : '0';
  });

  /** Pages affichées : la première, la dernière et les voisines de la page courante. */
  protected readonly numerosDePage = computed(() => {
    const { page, pages } = this.resultats();
    const garder = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
    const triees = [...garder].sort((a, b) => a - b);
    return triees.flatMap((n, i) => (i > 0 && n - triees[i - 1] > 1 ? ['…', n] : [n]));
  });

  protected readonly filtresAppliques = computed(() => this.min() != null || this.max() != null || this.stock());
  protected readonly seuilPetitsPrix = SEUIL_PETITS_PRIX;

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
