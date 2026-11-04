import type { ApercuPanier, LignePanierDemandee, ProduitPublic } from '@lce/contrats';

export interface ZoneCalcul {
  frais: number;
  seuilGratuit: number | null;
}

export interface CodeCalcul {
  code: string;
  type: 'POURCENTAGE' | 'MONTANT_FIXE' | 'LIVRAISON_OFFERTE';
  valeur: number;
  actif: boolean;
  debut: Date;
  fin: Date;
  utilisations: number;
  utilisationsMax: number | null;
  montantMinimum: number;
  /** Slug de la catégorie ciblée ; null = tout le catalogue. */
  categorie: string | null;
}

export interface EntreesCalcul {
  demandes: LignePanierDemandee[];
  produits: ProduitPublic[];
  zone: ZoneCalcul | null;
  /** Code saisi et, s'il existe, sa définition. */
  codeSaisi: string | null;
  code: CodeCalcul | null;
  maintenant: Date;
}

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * Calcule le panier à partir des prix et stocks actuels : ce que le client a dans
 * son navigateur n'est jamais cru. Fonction pure, sans accès à la base.
 */
export function calculerPanier(e: EntreesCalcul): ApercuPanier {
  const ajustements: string[] = [];

  // Une même ligne envoyée deux fois est additionnée.
  const quantites = new Map<string, number>();
  for (const d of e.demandes) quantites.set(d.produitId, (quantites.get(d.produitId) ?? 0) + d.quantite);

  const lignes = [...quantites].flatMap(([produitId, demandee]) => {
    const produit = e.produits.find((p) => p.id === produitId);
    if (!produit) {
      ajustements.push('Un article n’est plus disponible et a été retiré.');
      return [];
    }
    if (produit.stock === 0) {
      ajustements.push(`${produit.nom} est en rupture de stock et a été retiré.`);
      return [];
    }
    const quantite = Math.min(demandee, produit.stock);
    if (quantite < demandee) ajustements.push(`${produit.nom} : quantité ramenée à ${quantite}, le stock disponible.`);
    return [{ produit, quantite, sousTotal: quantite * produit.prix }];
  });

  const sousTotal = lignes.reduce((s, l) => s + l.sousTotal, 0);
  const nbArticles = lignes.reduce((n, l) => n + l.quantite, 0);

  const zone = e.zone;
  let frais = lignes.length && zone ? zone.frais : 0;
  if (zone?.seuilGratuit != null && sousTotal >= zone.seuilGratuit) frais = 0;

  let remise = 0;
  let codeApplique: ApercuPanier['codeApplique'] = null;
  let codeRefuse: string | null = null;

  if (e.codeSaisi) {
    const refus = motifDeRefus(e, sousTotal);
    if (refus) {
      codeRefuse = refus;
    } else {
      const c = e.code!;
      const assiette = c.categorie
        ? lignes.filter((l) => l.produit.categorie.slug === c.categorie).reduce((s, l) => s + l.sousTotal, 0)
        : sousTotal;
      switch (c.type) {
        case 'POURCENTAGE':
          remise = Math.round((assiette * c.valeur) / 100);
          codeApplique = { code: c.code, libelle: `−${c.valeur} %` };
          break;
        case 'MONTANT_FIXE':
          remise = Math.min(c.valeur, assiette);
          codeApplique = { code: c.code, libelle: `−${fcfa(c.valeur)}` };
          break;
        case 'LIVRAISON_OFFERTE':
          remise = frais;
          codeApplique = { code: c.code, libelle: 'Livraison offerte' };
          break;
      }
    }
  }

  return { lignes, nbArticles, sousTotal, frais, remise, total: sousTotal + frais - remise, codeApplique, codeRefuse, ajustements };
}

function motifDeRefus(e: EntreesCalcul, sousTotal: number): string | null {
  const c = e.code;
  const invalide = `Le code « ${e.codeSaisi} » n’est pas valable.`;
  if (!c || !c.actif) return invalide;
  if (e.maintenant < c.debut || e.maintenant > c.fin) return `Le code « ${c.code} » a expiré.`;
  if (c.utilisationsMax != null && c.utilisations >= c.utilisationsMax) return `Le code « ${c.code} » a déjà été utilisé au maximum.`;
  if (sousTotal < c.montantMinimum) return `Ce code demande au moins ${fcfa(c.montantMinimum)} d’achats.`;
  return null;
}
