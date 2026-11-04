import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  EcritureMouvement,
  EcritureProduit,
  EtatStock,
  LigneStock,
  ListeProduitsAdmin,
  ProduitAdmin,
  ProduitAdminDetail,
  VueStocks,
} from '@lce/contrats';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { Probleme } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

const PAR_PAGE = 20;
const TAILLES_IMAGE = [200, 400, 800] as const;

const INCLUSIONS = {
  categorie: { select: { id: true, nom: true } },
  stock: true,
  imageProduits: { orderBy: { ordre: 'asc' } },
} satisfies Prisma.ProduitInclude;
type ProduitLu = Prisma.ProduitGetPayload<{ include: typeof INCLUSIONS }>;

export function etatDuStock(disponible: number, seuil: number): EtatStock {
  if (disponible === 0) return 'rupture';
  return disponible <= seuil ? 'sous-seuil' : 'normal';
}

export function slugifier(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 110);
}

function versAdmin(p: ProduitLu): ProduitAdmin {
  const disponible = p.stock?.disponible ?? 0;
  const seuilAlerte = p.stock?.seuilAlerte ?? 5;
  return {
    id: p.id,
    slug: p.slug,
    reference: p.reference,
    nom: p.nom,
    categorie: p.categorie,
    rayon: p.rayon,
    prix: p.prix,
    prixBarre: p.prixBarre,
    publie: p.publie,
    nouveau: p.nouveau,
    icone: p.icone,
    disponible,
    reserve: p.stock?.reserve ?? 0,
    seuilAlerte,
    etatStock: etatDuStock(disponible, seuilAlerte),
    imagePrincipale: p.imageProduits[0]?.url200 ?? null,
  };
}

function versDetail(p: ProduitLu): ProduitAdminDetail {
  return {
    ...versAdmin(p),
    description: p.description,
    caracteristiques: p.caracteristiques as [string, string][],
    images: p.imageProduits.map((i) => ({ id: i.id, url200: i.url200, url400: i.url400, url800: i.url800 })),
    majLe: p.majLe.toISOString(),
  };
}

const introuvable = () => new Probleme('produit-introuvable', HttpStatus.NOT_FOUND, 'Produit introuvable');

export interface CriteresAdmin {
  q?: string;
  categorieId?: string;
  publication?: 'publies' | 'brouillons';
  stock?: EtatStock;
  page?: number;
}

@Injectable()
export class AdminProduitsService {
  private readonly dossierMedias: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.dossierMedias = config.get<string>('mediasDossier') ?? 'medias';
  }

  async lister(c: CriteresAdmin): Promise<ListeProduitsAdmin> {
    const where: Prisma.ProduitWhereInput = { supprimeLe: null };
    if (c.q) {
      where.OR = [{ nom: { contains: c.q, mode: 'insensitive' } }, { reference: { contains: c.q, mode: 'insensitive' } }];
    }
    if (c.categorieId) where.categorieId = c.categorieId;
    if (c.publication) where.publie = c.publication === 'publies';
    if (c.stock === 'rupture') where.stock = { disponible: 0 };

    // « Sous le seuil » compare deux colonnes : filtré après lecture.
    const tous = await this.prisma.produit.findMany({ where, include: INCLUSIONS, orderBy: [{ creeLe: 'desc' }, { id: 'asc' }] });
    const filtres = tous.map(versAdmin).filter((p) => !c.stock || p.etatStock === c.stock);
    const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
    const page = Math.min(Math.max(1, c.page ?? 1), pages);
    return { produits: filtres.slice((page - 1) * PAR_PAGE, page * PAR_PAGE), total: filtres.length, page, pages };
  }

  async lire(id: string): Promise<ProduitAdminDetail> {
    const p = await this.prisma.produit.findFirst({ where: { id, supprimeLe: null }, include: INCLUSIONS });
    if (!p) throw introuvable();
    return versDetail(p);
  }

  async creer(e: EcritureProduit, acteurId: string): Promise<ProduitAdminDetail> {
    this.verifierPrix(e.prix, e.prixBarre);
    const slug = await this.slugLibre(e.nom);
    const cree = await this.traduireConflit(() =>
      this.prisma.$transaction(async (tx) => {
        const p = await tx.produit.create({
          data: {
            slug,
            nom: e.nom.trim(),
            reference: e.reference?.trim() || null,
            categorieId: e.categorieId,
            rayon: e.rayon?.trim() ?? '',
            description: e.description ?? '',
            prix: e.prix,
            prixBarre: e.prixBarre ?? null,
            nouveau: e.nouveau ?? false,
            publie: e.publie ?? false,
            icone: e.icone ?? null,
            caracteristiques: e.caracteristiques ?? [],
            stock: { create: { seuilAlerte: e.seuilAlerte ?? 5 } },
          },
          include: INCLUSIONS,
        });
        await tx.journalAudit.create({
          data: { acteurId, action: 'produit.cree', entite: 'produit', entiteId: p.id, apres: { nom: p.nom, prix: p.prix, publie: p.publie } },
        });
        return p;
      }),
    );
    return versDetail(cree);
  }

  async modifier(id: string, e: Partial<EcritureProduit>, acteurId: string): Promise<ProduitAdminDetail> {
    const avant = await this.prisma.produit.findFirst({ where: { id, supprimeLe: null } });
    if (!avant) throw introuvable();
    const prix = e.prix ?? avant.prix;
    const prixBarre = e.prixBarre === undefined ? avant.prixBarre : e.prixBarre;
    this.verifierPrix(prix, prixBarre);

    const apres = await this.traduireConflit(() =>
      this.prisma.$transaction(async (tx) => {
        const p = await tx.produit.update({
          where: { id },
          data: {
            ...(e.nom !== undefined && { nom: e.nom.trim() }),
            ...(e.reference !== undefined && { reference: e.reference?.trim() || null }),
            ...(e.categorieId !== undefined && { categorieId: e.categorieId }),
            ...(e.rayon !== undefined && { rayon: e.rayon.trim() }),
            ...(e.description !== undefined && { description: e.description }),
            ...(e.prix !== undefined && { prix: e.prix }),
            ...(e.prixBarre !== undefined && { prixBarre: e.prixBarre }),
            ...(e.nouveau !== undefined && { nouveau: e.nouveau }),
            ...(e.publie !== undefined && { publie: e.publie }),
            ...(e.icone !== undefined && { icone: e.icone }),
            ...(e.caracteristiques !== undefined && { caracteristiques: e.caracteristiques }),
            ...(e.seuilAlerte !== undefined && { stock: { update: { seuilAlerte: e.seuilAlerte } } }),
          },
          include: INCLUSIONS,
        });
        await tx.journalAudit.create({
          data: {
            acteurId,
            action: 'produit.modifie',
            entite: 'produit',
            entiteId: id,
            avant: { nom: avant.nom, prix: avant.prix, prixBarre: avant.prixBarre, publie: avant.publie },
            apres: { nom: p.nom, prix: p.prix, prixBarre: p.prixBarre, publie: p.publie },
          },
        });
        return p;
      }),
    );
    return versDetail(apres);
  }

  /** Retrait logique : le produit reste lisible dans l'historique des commandes. */
  async retirer(id: string, acteurId: string): Promise<void> {
    const { count } = await this.prisma.produit.updateMany({
      where: { id, supprimeLe: null },
      data: { supprimeLe: new Date(), publie: false },
    });
    if (!count) throw introuvable();
    await this.prisma.journalAudit.create({ data: { acteurId, action: 'produit.retire', entite: 'produit', entiteId: id } });
  }

  /** Convertit la photo en WebP dans les 3 tailles. Un fichier qui n'est pas une image est refusé. */
  async ajouterImage(id: string, contenu: Buffer, acteurId: string): Promise<ProduitAdminDetail> {
    await this.lire(id);
    const nom = randomUUID();
    const dossier = join(this.dossierMedias, 'produits');
    await mkdir(dossier, { recursive: true });
    const urls: Record<number, string> = {};
    try {
      for (const taille of TAILLES_IMAGE) {
        const webp = await sharp(contenu)
          .rotate()
          .resize(taille, taille, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        await writeFile(join(dossier, `${nom}-${taille}.webp`), webp);
        urls[taille] = `/medias/produits/${nom}-${taille}.webp`;
      }
    } catch {
      throw new Probleme('image-invalide', HttpStatus.BAD_REQUEST, 'Ce fichier n’est pas une image lisible');
    }
    const dernier = await this.prisma.imageProduit.aggregate({ where: { produitId: id }, _max: { ordre: true } });
    await this.prisma.imageProduit.create({
      data: { produitId: id, url200: urls[200], url400: urls[400], url800: urls[800], ordre: (dernier._max.ordre ?? -1) + 1 },
    });
    await this.prisma.journalAudit.create({ data: { acteurId, action: 'produit.image_ajoutee', entite: 'produit', entiteId: id } });
    return this.lire(id);
  }

  async supprimerImage(id: string, imageId: string, acteurId: string): Promise<ProduitAdminDetail> {
    const image = await this.prisma.imageProduit.findFirst({ where: { id: imageId, produitId: id } });
    if (!image) throw new Probleme('image-introuvable', HttpStatus.NOT_FOUND, 'Image introuvable');
    await this.prisma.imageProduit.delete({ where: { id: imageId } });
    for (const url of [image.url200, image.url400, image.url800]) {
      // Un fichier déjà absent ne doit pas faire échouer la suppression.
      await unlink(join(this.dossierMedias, url.replace('/medias/', ''))).catch(() => undefined);
    }
    await this.prisma.journalAudit.create({ data: { acteurId, action: 'produit.image_supprimee', entite: 'produit', entiteId: id } });
    return this.lire(id);
  }

  async vueStocks(): Promise<VueStocks> {
    const stocks = await this.prisma.stock.findMany({
      where: { produit: { supprimeLe: null } },
      include: { produit: { select: { nom: true, reference: true, icone: true } } },
    });
    const lignes: LigneStock[] = stocks
      .map((s) => ({
        produitId: s.produitId,
        nom: s.produit.nom,
        reference: s.produit.reference,
        icone: s.produit.icone,
        disponible: s.disponible,
        reserve: s.reserve,
        seuilAlerte: s.seuilAlerte,
        etat: etatDuStock(s.disponible, s.seuilAlerte),
      }))
      .sort((a, b) => a.disponible - b.disponible || a.nom.localeCompare(b.nom, 'fr'));

    const mouvements = await this.prisma.mouvementStock.findMany({
      orderBy: { date: 'desc' },
      take: 15,
      include: { produit: { select: { nom: true } }, acteur: { select: { nom: true } } },
    });
    return {
      indicateurs: {
        ruptures: lignes.filter((l) => l.etat === 'rupture').length,
        sousSeuil: lignes.filter((l) => l.etat === 'sous-seuil').length,
        unitesReservees: lignes.reduce((n, l) => n + l.reserve, 0),
        produits: lignes.length,
      },
      lignes,
      mouvements: mouvements.map((m) => ({
        id: String(m.id),
        date: m.date.toISOString(),
        produit: m.produit.nom,
        type: m.type,
        quantite: m.quantite,
        motif: m.motif,
        acteur: m.acteur?.nom ?? 'Système',
      })),
    };
  }

  /**
   * Ajuste le stock. Verrou optimiste sur `version` : si une commande réserve au même
   * moment, l'une des deux écritures échoue au lieu d'écraser l'autre.
   */
  async mouvement(produitId: string, e: EcritureMouvement, acteurId: string): Promise<void> {
    const stock = await this.prisma.stock.findFirst({ where: { produitId, produit: { supprimeLe: null } } });
    if (!stock) throw introuvable();

    const delta = e.type === 'ENTREE' ? e.quantite : e.type === 'SORTIE' ? -e.quantite : e.quantite - stock.disponible;
    if (delta === 0) throw new Probleme('mouvement-nul', HttpStatus.BAD_REQUEST, 'Cette quantité ne change rien au stock');
    if (stock.disponible + delta < 0) {
      throw new Probleme('stock-insuffisant', HttpStatus.CONFLICT, `Il ne reste que ${stock.disponible} en stock`);
    }

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.stock.updateMany({
        where: { produitId, version: stock.version },
        data: { disponible: stock.disponible + delta, version: { increment: 1 } },
      });
      if (!count) throw new Probleme('stock-modifie', HttpStatus.CONFLICT, 'Le stock vient de changer : rechargez puis réessayez');
      await tx.mouvementStock.create({
        data: {
          produitId,
          type: e.type,
          // ENTREE et SORTIE sont positives (le type porte le sens) ; INVENTAIRE garde son signe.
          quantite: e.type === 'INVENTAIRE' ? delta : e.quantite,
          motif: e.motif?.trim() || null,
          acteurId,
        },
      });
    });
  }

  private verifierPrix(prix: number, prixBarre: number | null | undefined): void {
    if (prixBarre != null && prixBarre <= prix) {
      throw new Probleme('prix-incoherent', HttpStatus.BAD_REQUEST, 'L’ancien prix doit être supérieur au prix de vente');
    }
  }

  private async slugLibre(nom: string): Promise<string> {
    const base = slugifier(nom) || 'produit';
    let slug = base;
    for (let i = 2; await this.prisma.produit.findFirst({ where: { slug, supprimeLe: null }, select: { id: true } }); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  private async traduireConflit<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new Probleme('reference-existante', HttpStatus.CONFLICT, 'Cette référence est déjà utilisée');
        if (e.code === 'P2003') throw new Probleme('categorie-introuvable', HttpStatus.BAD_REQUEST, 'Catégorie introuvable');
      }
      throw e;
    }
  }
}
