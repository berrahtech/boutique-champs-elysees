import { Injectable } from '@nestjs/common';
import type {
  Accueil,
  CategoriePublique,
  DetailProduit,
  Filtre,
  ProduitPublic,
  ResultatsCatalogue,
  Tri,
  ZonePublique,
} from '@lce/contrats';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../commun/prisma/prisma.service';

export const PAR_PAGE = 12;
export const SEUIL_PETITS_PRIX = 20_000;

/** Libellés courts de la barre des catégories et icônes, tant qu'ils ne sont pas en base. */
const PRESENTATION: Record<string, { court: string; icone: string }> = {
  mode: { court: 'Mode', icone: 'mode' },
  'chaussures-accessoires': { court: 'Chaussures', icone: 'chaussure' },
  'parfums-cosmetiques': { court: 'Beauté', icone: 'parfum' },
  electromenager: { court: 'Électroménager', icone: 'electromenager' },
  'telephones-informatique': { court: 'Téléphones & PC', icone: 'ordinateur' },
  electronique: { court: 'Électronique', icone: 'ecran' },
  'maison-decoration': { court: 'Maison', icone: 'maison' },
  divers: { court: 'Divers', icone: 'divers' },
};

export interface Criteres {
  categorie?: string;
  q?: string;
  filtre?: Filtre;
  tri?: Tri;
  min?: number;
  max?: number;
  enStock?: boolean;
  page?: number;
  parPage?: number;
  ids?: string[];
}

const INCLUSIONS = {
  categorie: { select: { slug: true, nom: true } },
  stock: { select: { disponible: true } },
  imageProduits: { orderBy: { ordre: 'asc' } },
} satisfies Prisma.ProduitInclude;

type ProduitLu = Prisma.ProduitGetPayload<{ include: typeof INCLUSIONS }>;

export function versProduitPublic(p: ProduitLu): ProduitPublic {
  return {
    id: p.id,
    slug: p.slug,
    reference: p.reference,
    nom: p.nom,
    categorie: p.categorie,
    rayon: p.rayon,
    prix: p.prix,
    prixBarre: p.prixBarre,
    nouveau: p.nouveau,
    noteMoyenne: Number(p.noteMoyenne),
    nbAvis: p.nbAvis,
    stock: p.stock?.disponible ?? 0,
    icone: p.icone,
    images: p.imageProduits.map((i) => ({ id: i.id, url200: i.url200, url400: i.url400, url800: i.url800 })),
    description: p.description,
    caracteristiques: p.caracteristiques as [string, string][],
  };
}

/** Transforme une saisie libre en requête plein texte : mots sans accents, préfixes, tous exigés. */
export function versRequeteTexte(saisie: string): string | null {
  const mots = saisie
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'o')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 8);
  return mots.length ? mots.map((m) => `${m}:*`).join(' & ') : null;
}

/** Remise en pourcentage arrondie, 0 sans prix barré. */
export function remisePourcentage(p: { prix: number; prixBarre: number | null }): number {
  return p.prixBarre && p.prixBarre > p.prix ? Math.round((1 - p.prix / p.prixBarre) * 100) : 0;
}

@Injectable()
export class CatalogueService {
  /** Visible en boutique : publié et non retiré. */
  private readonly visible: Prisma.ProduitWhereInput = { publie: true, supprimeLe: null };

  constructor(private readonly prisma: PrismaService) {}

  async categories(): Promise<CategoriePublique[]> {
    const categories = await this.prisma.categorie.findMany({
      where: { parentId: null },
      orderBy: { ordre: 'asc' },
      include: { produits: { where: this.visible, select: { id: true } } },
    });
    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      nom: c.nom,
      court: PRESENTATION[c.slug]?.court ?? c.nom,
      icone: PRESENTATION[c.slug]?.icone ?? 'divers',
      nbProduits: c.produits.length,
    }));
  }

  async zones(): Promise<ZonePublique[]> {
    const zones = await this.prisma.zone.findMany({ where: { actif: true }, orderBy: { frais: 'asc' } });
    return zones.map(({ id, nom, frais, delaiHeures, seuilGratuit }) => ({ id, nom, frais, delaiHeures, seuilGratuit }));
  }

  async rechercher(c: Criteres): Promise<ResultatsCatalogue> {
    const parPage = Math.min(c.parPage ?? PAR_PAGE, 48);
    const where = await this.conditions(c);
    const groupes = await this.prisma.produit.groupBy({ by: ['categorieId'], where, _count: true });
    const categories = await this.prisma.categorie.findMany({ select: { id: true, slug: true } });
    const parCategorie: Record<string, number> = {};
    for (const g of groupes) {
      const slug = categories.find((x) => x.id === g.categorieId)?.slug;
      if (slug) parCategorie[slug] = g._count;
    }

    const whereFinal: Prisma.ProduitWhereInput = c.categorie ? { ...where, categorie: { slug: c.categorie } } : where;
    const total = await this.prisma.produit.count({ where: whereFinal });
    const pages = Math.max(1, Math.ceil(total / parPage));
    const page = Math.min(Math.max(1, c.page ?? 1), pages);
    const produits = await this.prisma.produit.findMany({
      where: whereFinal,
      include: INCLUSIONS,
      orderBy: this.ordre(c),
      skip: (page - 1) * parPage,
      take: parPage,
    });
    return { produits: produits.map(versProduitPublic), total, page, pages, parCategorie };
  }

  async detail(slug: string): Promise<DetailProduit | null> {
    const produit = await this.prisma.produit.findFirst({ where: { ...this.visible, slug }, include: INCLUSIONS });
    if (!produit) return null;
    const similaires = await this.prisma.produit.findMany({
      where: { ...this.visible, categorieId: produit.categorieId, id: { not: produit.id } },
      include: INCLUSIONS,
      orderBy: { nbVentes: 'desc' },
      take: 4,
    });
    return { produit: versProduitPublic(produit), similaires: similaires.map(versProduitPublic) };
  }

  async parIds(ids: string[]): Promise<ProduitPublic[]> {
    if (!ids.length) return [];
    const produits = await this.prisma.produit.findMany({ where: { ...this.visible, id: { in: ids } }, include: INCLUSIONS });
    return produits.map(versProduitPublic);
  }

  async accueil(): Promise<Accueil> {
    const liste = (where: Prisma.ProduitWhereInput, orderBy: Prisma.ProduitOrderByWithRelationInput, take: number) =>
      this.prisma.produit
        .findMany({ where: { ...this.visible, ...where }, include: INCLUSIONS, orderBy, take })
        .then((r) => r.map(versProduitPublic));

    const parVentes = { nbVentes: 'desc' } as const;
    const [nouveautes, tousEnPromo, ventes, selectionBeaute, electromenager, maison, smartphones] = await Promise.all([
      liste({ nouveau: true }, { creeLe: 'desc' }, 4),
      liste({ prixBarre: { not: null } }, parVentes, 48),
      liste({}, parVentes, 10),
      liste({ categorie: { slug: 'parfums-cosmetiques' } }, parVentes, 3),
      liste({ categorie: { slug: 'electromenager' } }, parVentes, 2),
      liste({ categorie: { slug: 'maison-decoration' } }, parVentes, 1),
      this.prisma.produit.aggregate({ where: { ...this.visible, rayon: 'Smartphones' }, _min: { prix: true } }),
    ]);
    const enPromo = tousEnPromo.filter((p) => remisePourcentage(p) > 0).sort((a, b) => remisePourcentage(b) - remisePourcentage(a));
    const remisesElectromenager = enPromo.filter((p) => p.categorie.slug === 'electromenager').map(remisePourcentage);

    return {
      nouveautes,
      promotions: enPromo.slice(0, 4),
      meilleuresVentes: ventes.slice(0, 4),
      populaires: ventes.slice(4, 10),
      selectionBeaute,
      selectionMaison: [...electromenager, ...maison],
      prixMinSmartphones: smartphones._min.prix,
      remiseMaxElectromenager: Math.max(0, ...remisesElectromenager),
      remiseMax: Math.max(0, ...enPromo.map(remisePourcentage)),
    };
  }

  private async conditions(c: Criteres): Promise<Prisma.ProduitWhereInput> {
    const et: Prisma.ProduitWhereInput[] = [this.visible];
    if (c.ids) et.push({ id: { in: c.ids } });
    if (c.q) {
      const requete = versRequeteTexte(c.q);
      // Plein texte en SQL : Prisma ne connaît pas la colonne tsvector.
      const lignes = requete
        ? await this.prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM lce.produit
            WHERE recherche @@ to_tsquery('french', ${requete})
            ORDER BY ts_rank(recherche, to_tsquery('french', ${requete})) DESC
            LIMIT 500`
        : [];
      et.push({ id: { in: lignes.map((l) => l.id) } });
    }
    if (c.filtre === 'promotions') et.push({ prixBarre: { not: null } });
    if (c.filtre === 'nouveautes') et.push({ nouveau: true });
    if (c.filtre === 'petits-prix') et.push({ prix: { lt: SEUIL_PETITS_PRIX } });
    if (c.min != null) et.push({ prix: { gte: c.min } });
    if (c.max != null) et.push({ prix: { lte: c.max } });
    if (c.enStock) et.push({ stock: { disponible: { gt: 0 } } });
    return { AND: et };
  }

  private ordre(c: Criteres): Prisma.ProduitOrderByWithRelationInput[] {
    const stable = { id: 'asc' } as const; // Pagination stable quand plusieurs produits sont à égalité.
    if (c.filtre === 'meilleures-ventes') return [{ nbVentes: 'desc' }, stable];
    switch (c.tri) {
      case 'prix-croissant':
        return [{ prix: 'asc' }, stable];
      case 'prix-decroissant':
        return [{ prix: 'desc' }, stable];
      case 'nouveautes':
        return [{ nouveau: 'desc' }, { creeLe: 'desc' }, stable];
      default:
        return [{ nbVentes: 'desc' }, stable];
    }
  }
}
