import { TestBed } from '@angular/core/testing';
import { Catalogue, Produit } from '../donnees/catalogue';
import { Panier } from './panier';

describe('Panier', () => {
  let panier: Panier;
  let enStock: Produit;
  let enRupture: Produit;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    const catalogue = TestBed.inject(Catalogue);
    const tous = catalogue.meilleuresVentes(99);
    enStock = tous.find((p) => p.stock >= 3)!;
    enRupture = tous.find((p) => p.stock === 0)!;
    panier = TestBed.inject(Panier);
  });

  it('additionne les quantités et le sous-total', () => {
    panier.ajouter(enStock.id, 2);
    panier.ajouter(enStock.id);
    expect(panier.nbArticles()).toBe(3);
    expect(panier.sousTotal()).toBe(3 * enStock.prix);
  });

  it('ne dépasse jamais le stock et dit combien a été ajouté', () => {
    expect(panier.ajouter(enStock.id, enStock.stock + 50)).toBe(enStock.stock);
    expect(panier.ajouter(enStock.id)).toBe(0);
    expect(panier.nbArticles()).toBe(enStock.stock);
  });

  it('refuse un produit en rupture', () => {
    expect(panier.ajouter(enRupture.id)).toBe(0);
    expect(panier.estVide()).toBe(true);
  });

  it('retire la ligne quand la quantité tombe à zéro', () => {
    panier.ajouter(enStock.id);
    panier.changerQuantite(enStock.id, 0);
    expect(panier.estVide()).toBe(true);
  });

  it('retrouve le panier enregistré au rechargement', () => {
    panier.ajouter(enStock.id, 2);
    TestBed.tick();
    TestBed.resetTestingModule();
    expect(TestBed.inject(Panier).nbArticles()).toBe(2);
  });

  it('ignore un stockage corrompu', () => {
    localStorage.setItem('lce.panier.v1', '{"pas":"une liste"}');
    TestBed.resetTestingModule();
    expect(TestBed.inject(Panier).estVide()).toBe(true);
  });
});
