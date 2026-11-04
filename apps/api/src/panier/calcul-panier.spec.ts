import type { ProduitPublic } from '@lce/contrats';
import { calculerPanier, CodeCalcul, EntreesCalcul } from './calcul-panier';

const produit = (id: string, prix: number, stock: number, categorie = 'mode'): ProduitPublic => ({
  id,
  slug: id,
  reference: null,
  nom: `Produit ${id}`,
  categorie: { slug: categorie, nom: categorie },
  rayon: '',
  prix,
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

const MAINTENANT = new Date('2026-06-01');
const code = (c: Partial<CodeCalcul> = {}): CodeCalcul => ({
  code: 'PROMO',
  type: 'POURCENTAGE',
  valeur: 10,
  actif: true,
  debut: new Date('2026-01-01'),
  fin: new Date('2026-12-31'),
  utilisations: 0,
  utilisationsMax: null,
  montantMinimum: 0,
  categorie: null,
  ...c,
});

const calcul = (e: Partial<EntreesCalcul>) =>
  calculerPanier({
    demandes: [{ produitId: 'a', quantite: 2 }],
    produits: [produit('a', 10_000, 5)],
    zone: { frais: 1500, seuilGratuit: null },
    codeSaisi: null,
    code: null,
    maintenant: MAINTENANT,
    ...e,
  });

describe('calculerPanier', () => {
  it('additionne sous-total, frais et total avec les prix du serveur', () => {
    const r = calcul({});
    expect(r).toMatchObject({ nbArticles: 2, sousTotal: 20_000, frais: 1500, remise: 0, total: 21_500 });
  });

  it('ramène la quantité au stock et le signale', () => {
    const r = calcul({ demandes: [{ produitId: 'a', quantite: 9 }] });
    expect(r.lignes[0].quantite).toBe(5);
    expect(r.ajustements[0]).toContain('quantité ramenée à 5');
  });

  it('retire un produit en rupture ou disparu, sans frais si le panier est vide', () => {
    const r = calcul({ produits: [produit('a', 10_000, 0)] });
    expect(r.lignes).toEqual([]);
    expect(r.frais).toBe(0);
    expect(r.total).toBe(0);
    expect(calcul({ produits: [] }).ajustements).toHaveLength(1);
  });

  it('additionne une ligne envoyée en double', () => {
    const r = calcul({ demandes: [{ produitId: 'a', quantite: 1 }, { produitId: 'a', quantite: 2 }] });
    expect(r.lignes).toHaveLength(1);
    expect(r.nbArticles).toBe(3);
  });

  it('offre la livraison au-dessus du seuil de la zone', () => {
    expect(calcul({ zone: { frais: 1500, seuilGratuit: 20_000 } }).frais).toBe(0);
    expect(calcul({ zone: { frais: 1500, seuilGratuit: 20_001 } }).frais).toBe(1500);
  });

  it('applique un pourcentage arrondi à l’entier', () => {
    const r = calcul({ produits: [produit('a', 3333, 5)], demandes: [{ produitId: 'a', quantite: 1 }], codeSaisi: 'PROMO', code: code() });
    expect(r.remise).toBe(333);
    expect(r.codeApplique?.libelle).toBe('−10 %');
  });

  it('limite un montant fixe au sous-total : le total ne devient jamais négatif', () => {
    const r = calcul({ codeSaisi: 'PROMO', code: code({ type: 'MONTANT_FIXE', valeur: 999_999 }) });
    expect(r.remise).toBe(20_000);
    expect(r.total).toBe(1500);
  });

  it('livraison offerte : la remise vaut les frais', () => {
    const r = calcul({ codeSaisi: 'PROMO', code: code({ type: 'LIVRAISON_OFFERTE', valeur: 0 }) });
    expect(r.remise).toBe(1500);
    expect(r.total).toBe(20_000);
  });

  it('ne compte que la catégorie ciblée', () => {
    const r = calcul({
      produits: [produit('a', 10_000, 5, 'mode'), produit('b', 50_000, 5, 'maison')],
      demandes: [{ produitId: 'a', quantite: 1 }, { produitId: 'b', quantite: 1 }],
      codeSaisi: 'PROMO',
      code: code({ categorie: 'mode' }),
    });
    expect(r.remise).toBe(1000);
  });

  it.each([
    ['inconnu', null, 'pas valable'],
    ['désactivé', code({ actif: false }), 'pas valable'],
    ['expiré', code({ fin: new Date('2026-01-31') }), 'expiré'],
    ['pas commencé', code({ debut: new Date('2026-12-01') }), 'expiré'],
    ['épuisé', code({ utilisations: 5, utilisationsMax: 5 }), 'maximum'],
    ['minimum non atteint', code({ montantMinimum: 50_000 }), 'au moins'],
  ])('refuse un code %s sans appliquer de remise', (_, c, motif) => {
    const r = calcul({ codeSaisi: 'PROMO', code: c });
    expect(r.remise).toBe(0);
    expect(r.codeApplique).toBeNull();
    expect(r.codeRefuse).toContain(motif);
  });
});
