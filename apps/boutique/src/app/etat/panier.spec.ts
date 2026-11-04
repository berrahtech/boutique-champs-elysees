import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ProduitPublic } from '@lce/contrats';
import { fusionnerPaniers, Panier } from './panier';

const produit = (id: string, stock: number): ProduitPublic => ({
  id,
  slug: id,
  reference: null,
  nom: id,
  categorie: { slug: 'mode', nom: 'Mode' },
  rayon: '',
  prix: 1000,
  prixBarre: null,
  nouveau: false,
  noteMoyenne: 0,
  nbAvis: 0,
  stock,
  icone: null,
  images: [],
  description: '',
  caracteristiques: [],
});

describe('Panier', () => {
  let panier: Panier;

  const creer = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    panier = TestBed.inject(Panier);
  };

  beforeEach(() => {
    localStorage.clear();
    creer();
  });

  it('additionne les quantités', () => {
    panier.ajouter(produit('a', 5), 2);
    panier.ajouter(produit('a', 5));
    expect(panier.nbArticles()).toBe(3);
  });

  it('ne dépasse jamais le stock et dit combien a été ajouté', () => {
    expect(panier.ajouter(produit('a', 3), 50)).toBe(3);
    expect(panier.ajouter(produit('a', 3))).toBe(0);
    expect(panier.nbArticles()).toBe(3);
  });

  it('refuse un produit en rupture', () => {
    expect(panier.ajouter(produit('a', 0))).toBe(0);
    expect(panier.estVide()).toBe(true);
  });

  it('retire la ligne quand la quantité tombe à zéro', () => {
    panier.ajouter(produit('a', 5));
    panier.changerQuantite('a', 0);
    expect(panier.estVide()).toBe(true);
  });

  it('retrouve le panier enregistré au rechargement', () => {
    panier.ajouter(produit('a', 5), 2);
    TestBed.tick();
    creer();
    expect(panier.nbArticles()).toBe(2);
  });

  it('ignore un stockage corrompu', () => {
    localStorage.setItem('lce.panier.v2', '{"pas":"une liste"}');
    creer();
    expect(panier.estVide()).toBe(true);
  });

  it('demande le calcul au serveur avec les lignes et le code', () => {
    panier.ajouter(produit('a', 5), 2);
    panier.codePromo.set('BIENVENUE10');
    TestBed.tick();
    const requete = TestBed.inject(HttpTestingController).expectOne('/api/v1/panier/apercu');
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ lignes: [{ produitId: 'a', quantite: 2 }], codePromo: 'BIENVENUE10' });
  });
});

describe('fusionnerPaniers', () => {
  it('réunit les deux paniers en gardant la plus grande quantité', () => {
    const r = fusionnerPaniers(
      [{ produitId: 'a', quantite: 1 }, { produitId: 'b', quantite: 2 }],
      [{ produitId: 'a', quantite: 3 }, { produitId: 'c', quantite: 1 }],
    );
    expect(r).toEqual([{ produitId: 'a', quantite: 3 }, { produitId: 'b', quantite: 2 }, { produitId: 'c', quantite: 1 }]);
  });
});
