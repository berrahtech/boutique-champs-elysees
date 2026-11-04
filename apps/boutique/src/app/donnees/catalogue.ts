import { Injectable } from '@angular/core';
import type { NomIcone } from '@lce/ui';
import { CATEGORIES, PRODUITS } from './catalogue-demo';

export interface Categorie {
  slug: string;
  nom: string;
  /** Libellé court de la barre des catégories. */
  court: string;
  icone: NomIcone;
}

export interface Produit {
  id: string;
  slug: string;
  reference: string;
  nom: string;
  categorie: string;
  /** Rayon affiché sur la carte (« Smartphones », « Cosmétiques »…). */
  rayon: string;
  prix: number;
  prixBarre?: number;
  nouveau?: boolean;
  noteMoyenne: number;
  nbAvis: number;
  stock: number;
  /** Nombre de ventes, pour « Meilleures ventes ». */
  ventes: number;
  icone: NomIcone;
  description: string;
  caracteristiques: [string, string][];
}

export type Filtre = 'tout' | 'promotions' | 'nouveautes' | 'meilleures-ventes' | 'petits-prix';
export type Tri = 'popularite' | 'nouveautes' | 'prix-croissant' | 'prix-decroissant';

export interface Criteres {
  categorie?: string;
  recherche?: string;
  filtre?: Filtre;
  prixMin?: number;
  prixMax?: number;
  enStock?: boolean;
  tri?: Tri;
  page?: number;
}

export interface Resultats {
  produits: Produit[];
  total: number;
  page: number;
  pages: number;
  /** Nombre d'articles par catégorie pour les mêmes critères (hors catégorie). */
  parCategorie: Record<string, number>;
}

export const PAR_PAGE = 12;
export const SEUIL_PETITS_PRIX = 20_000;

/** Minuscules sans accents, pour une recherche tolérante (« electromenager » trouve « Électroménager »). */
export function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function estEnPromotion(p: Produit): boolean {
  return !!p.prixBarre && p.prixBarre > p.prix;
}

/**
 * Catalogue de la boutique. Lot 0 : données de démonstration tirées des maquettes,
 * servies en mémoire. Au lot 1, la même interface interrogera GET /api/v1/produits.
 */
@Injectable({ providedIn: 'root' })
export class Catalogue {
  readonly categories: readonly Categorie[] = CATEGORIES;
  private readonly produits: readonly Produit[] = PRODUITS;

  categorie(slug: string): Categorie | undefined {
    return this.categories.find((c) => c.slug === slug);
  }

  produit(slug: string): Produit | undefined {
    return this.produits.find((p) => p.slug === slug);
  }

  parId(id: string): Produit | undefined {
    return this.produits.find((p) => p.id === id);
  }

  nouveautes(nombre = 4): Produit[] {
    return this.produits.filter((p) => p.nouveau).slice(0, nombre);
  }

  promotions(nombre = 4): Produit[] {
    return this.produits
      .filter(estEnPromotion)
      .sort((a, b) => b.prixBarre! / b.prix - a.prixBarre! / a.prix)
      .slice(0, nombre);
  }

  meilleuresVentes(nombre = 4): Produit[] {
    return [...this.produits].sort((a, b) => b.ventes - a.ventes).slice(0, nombre);
  }

  deCategorie(slug: string, nombre = 3): Produit[] {
    return this.produits.filter((p) => p.categorie === slug).slice(0, nombre);
  }

  similaires(produit: Produit, nombre = 4): Produit[] {
    return this.produits.filter((p) => p.categorie === produit.categorie && p.id !== produit.id).slice(0, nombre);
  }

  /** Prix le plus bas d'un rayon (« Smartphones à partir de … »). */
  prixMinimum(rayon: string): number {
    return Math.min(...this.produits.filter((p) => p.rayon === rayon).map((p) => p.prix));
  }

  rechercher(criteres: Criteres): Resultats {
    const termes = normaliser(criteres.recherche ?? '').split(/\s+/).filter(Boolean);
    const correspond = (p: Produit) => {
      if (termes.length) {
        const texte = normaliser(`${p.nom} ${p.rayon} ${p.reference} ${this.categorie(p.categorie)?.nom ?? ''}`);
        if (!termes.every((t) => texte.includes(t))) return false;
      }
      switch (criteres.filtre) {
        case 'promotions':
          if (!estEnPromotion(p)) return false;
          break;
        case 'nouveautes':
          if (!p.nouveau) return false;
          break;
        case 'petits-prix':
          if (p.prix >= SEUIL_PETITS_PRIX) return false;
          break;
      }
      if (criteres.prixMin != null && p.prix < criteres.prixMin) return false;
      if (criteres.prixMax != null && p.prix > criteres.prixMax) return false;
      if (criteres.enStock && p.stock === 0) return false;
      return true;
    };

    const horsCategorie = this.produits.filter(correspond);
    const parCategorie: Record<string, number> = {};
    for (const p of horsCategorie) parCategorie[p.categorie] = (parCategorie[p.categorie] ?? 0) + 1;

    let liste = criteres.categorie ? horsCategorie.filter((p) => p.categorie === criteres.categorie) : horsCategorie;
    const tri = criteres.filtre === 'meilleures-ventes' ? 'popularite' : (criteres.tri ?? 'popularite');
    liste = [...liste].sort((a, b) => {
      switch (tri) {
        case 'prix-croissant':
          return a.prix - b.prix;
        case 'prix-decroissant':
          return b.prix - a.prix;
        case 'nouveautes':
          return Number(!!b.nouveau) - Number(!!a.nouveau);
        default:
          return b.ventes - a.ventes;
      }
    });

    const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
    const page = Math.min(Math.max(1, criteres.page ?? 1), pages);
    return {
      produits: liste.slice((page - 1) * PAR_PAGE, page * PAR_PAGE),
      total: liste.length,
      page,
      pages,
      parCategorie,
    };
  }
}
