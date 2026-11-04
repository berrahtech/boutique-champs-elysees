import { TestBed } from '@angular/core/testing';
import { Catalogue, estEnPromotion, PAR_PAGE, SEUIL_PETITS_PRIX } from './catalogue';
import { normaliserTelephone } from './telephone';

describe('Catalogue', () => {
  let catalogue: Catalogue;

  beforeEach(() => {
    catalogue = TestBed.inject(Catalogue);
  });

  it('propose les 8 catégories des maquettes, chacune avec des produits', () => {
    expect(catalogue.categories.length).toBe(8);
    const { parCategorie } = catalogue.rechercher({});
    for (const c of catalogue.categories) expect(parCategorie[c.slug]).toBeGreaterThan(0);
  });

  it('a des identifiants et des adresses uniques', () => {
    const { total } = catalogue.rechercher({});
    const tous = catalogue.meilleuresVentes(total);
    expect(new Set(tous.map((p) => p.slug)).size).toBe(total);
    expect(new Set(tous.map((p) => p.reference)).size).toBe(total);
  });

  it('cherche sans tenir compte des accents ni des majuscules', () => {
    const noms = catalogue.rechercher({ recherche: 'REFRIGERATEUR' }).produits.map((p) => p.nom);
    expect(noms).toEqual(['Réfrigérateur 2 portes 260 L']);
  });

  it('exige tous les mots de la recherche', () => {
    expect(catalogue.rechercher({ recherche: 'smartphone 128' }).total).toBeGreaterThan(0);
    expect(catalogue.rechercher({ recherche: 'smartphone chaussette' }).total).toBe(0);
  });

  it('filtre les promotions et les petits prix', () => {
    const promos = catalogue.rechercher({ filtre: 'promotions' }).produits;
    expect(promos.length).toBeGreaterThan(0);
    expect(promos.every(estEnPromotion)).toBe(true);
    expect(catalogue.rechercher({ filtre: 'petits-prix' }).produits.every((p) => p.prix < SEUIL_PETITS_PRIX)).toBe(true);
  });

  it('applique la fourchette de prix et le stock', () => {
    const r = catalogue.rechercher({ prixMin: 10_000, prixMax: 30_000, enStock: true });
    expect(r.produits.every((p) => p.prix >= 10_000 && p.prix <= 30_000 && p.stock > 0)).toBe(true);
  });

  it('trie par prix', () => {
    const prix = catalogue.rechercher({ tri: 'prix-croissant' }).produits.map((p) => p.prix);
    expect(prix).toEqual([...prix].sort((a, b) => a - b));
  });

  it('pagine, et ramène une page trop grande à la dernière', () => {
    const r = catalogue.rechercher({ page: 999 });
    expect(r.page).toBe(r.pages);
    expect(catalogue.rechercher({ page: 1 }).produits.length).toBe(PAR_PAGE);
  });

  it('garde le compte par catégorie quand une catégorie est choisie', () => {
    const r = catalogue.rechercher({ categorie: 'mode' });
    expect(r.produits.every((p) => p.categorie === 'mode')).toBe(true);
    expect(r.parCategorie['electromenager']).toBeGreaterThan(0);
  });

  it('calcule « à partir de » sur le rayon, pas sur toute la catégorie', () => {
    expect(catalogue.prixMinimum('Smartphones')).toBe(92_000);
  });
});

describe('normaliserTelephone (boutique)', () => {
  it('suit la même règle que l’API', () => {
    expect(normaliserTelephone('76 12 34 56')).toBe('+22376123456');
    expect(normaliserTelephone('+223 76-12-34-56')).toBe('+22376123456');
    expect(normaliserTelephone('7612345')).toBeNull();
    expect(normaliserTelephone('06123456')).toBeNull();
  });
});
