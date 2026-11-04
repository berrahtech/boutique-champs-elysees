import { Body, Controller, Delete, Get, Injectable, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import type { ApercuPanier, PanierEnregistre } from '@lce/contrats';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CatalogueService } from '../catalogue/catalogue.service';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Public, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';
import { calculerPanier } from './calcul-panier';

const ARTICLES_MAX = 50;

export class LigneDto {
  @IsUUID('all', { message: 'produitId : identifiant invalide' })
  produitId!: string;

  @IsInt({ message: 'quantite : nombre entier attendu' })
  @Min(1, { message: 'quantite : 1 au minimum' })
  @Max(99, { message: 'quantite : 99 au maximum' })
  quantite!: number;
}

export class PanierDto {
  @IsArray()
  @ArrayMaxSize(ARTICLES_MAX, { message: `lignes : ${ARTICLES_MAX} articles au maximum` })
  @ValidateNested({ each: true })
  @Type(() => LigneDto)
  lignes!: LigneDto[];

  @IsOptional() @IsString() @MaxLength(30)
  codePromo?: string | null;
}

export class ApercuDto extends PanierDto {
  @IsOptional() @IsUUID()
  zoneId?: string;
}

export class FavorisDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  produitIds!: string[];
}

@Injectable()
export class PanierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogue: CatalogueService,
  ) {}

  async apercu({ lignes, zoneId, codePromo }: ApercuDto): Promise<ApercuPanier> {
    const produits = await this.catalogue.parIds(lignes.map((l) => l.produitId));
    const zone = zoneId
      ? await this.prisma.zone.findFirst({ where: { id: zoneId, actif: true } })
      : await this.prisma.zone.findFirst({ where: { actif: true }, orderBy: { frais: 'asc' } });
    const codeSaisi = codePromo?.trim().toUpperCase() || null;
    const code = codeSaisi
      ? await this.prisma.codePromo.findUnique({ where: { code: codeSaisi }, include: { categorie: { select: { slug: true } } } })
      : null;
    return calculerPanier({
      demandes: lignes,
      produits,
      zone,
      codeSaisi,
      code: code && { ...code, categorie: code.categorie?.slug ?? null },
      maintenant: new Date(),
    });
  }

  async lire(utilisateurId: string): Promise<PanierEnregistre> {
    const panier = await this.prisma.panier.findUnique({
      where: { utilisateurId },
      include: { lignePaniers: { orderBy: { ajouteLe: 'asc' } } },
    });
    return {
      lignes: panier?.lignePaniers.map(({ produitId, quantite }) => ({ produitId, quantite })) ?? [],
      codePromo: panier?.codePromo ?? null,
    };
  }

  /** Remplace le panier du compte par celui de l'appareil. Les produits inconnus sont ignorés. */
  async enregistrer(utilisateurId: string, { lignes, codePromo }: PanierDto): Promise<PanierEnregistre> {
    const existants = await this.prisma.produit.findMany({
      where: { id: { in: lignes.map((l) => l.produitId) }, supprimeLe: null },
      select: { id: true },
    });
    const valides = new Set(existants.map((p) => p.id));
    const quantites = new Map<string, number>();
    for (const l of lignes) {
      if (valides.has(l.produitId)) quantites.set(l.produitId, Math.min(99, (quantites.get(l.produitId) ?? 0) + l.quantite));
    }
    await this.prisma.$transaction(async (tx) => {
      const panier = await tx.panier.upsert({
        where: { utilisateurId },
        update: { codePromo: codePromo ?? null, majLe: new Date() },
        create: { utilisateurId, codePromo: codePromo ?? null },
      });
      await tx.lignePanier.deleteMany({ where: { panierId: panier.id } });
      await tx.lignePanier.createMany({
        data: [...quantites].map(([produitId, quantite]) => ({ panierId: panier.id, produitId, quantite })),
      });
    });
    return this.lire(utilisateurId);
  }

  async lireFavoris(utilisateurId: string): Promise<string[]> {
    const favoris = await this.prisma.favori.findMany({ where: { utilisateurId }, orderBy: { ajouteLe: 'asc' }, select: { produitId: true } });
    return favoris.map((f) => f.produitId);
  }

  /** Ajoute des favoris sans toucher à ceux déjà présents (fusion à la connexion). */
  async ajouterFavoris(utilisateurId: string, produitIds: string[]): Promise<string[]> {
    const existants = await this.prisma.produit.findMany({ where: { id: { in: produitIds }, supprimeLe: null }, select: { id: true } });
    await this.prisma.favori.createMany({
      data: existants.map((p) => ({ utilisateurId, produitId: p.id })),
      skipDuplicates: true,
    });
    return this.lireFavoris(utilisateurId);
  }

  async retirerFavori(utilisateurId: string, produitId: string): Promise<void> {
    await this.prisma.favori.deleteMany({ where: { utilisateurId, produitId } });
  }
}

@Controller()
export class PanierController {
  constructor(private readonly panier: PanierService) {}

  /** Montants du panier, connecté ou non. */
  @Public()
  @Post('panier/apercu')
  apercu(@Body() corps: ApercuDto) {
    return this.panier.apercu(corps);
  }

  @Get('panier')
  lire(@UtilisateurCourant() jeton: JetonAcces) {
    return this.panier.lire(jeton.sub);
  }

  @Put('panier')
  enregistrer(@UtilisateurCourant() jeton: JetonAcces, @Body() corps: PanierDto) {
    return this.panier.enregistrer(jeton.sub, corps);
  }

  @Get('favoris')
  favoris(@UtilisateurCourant() jeton: JetonAcces) {
    return this.panier.lireFavoris(jeton.sub);
  }

  @Post('favoris')
  ajouterFavoris(@UtilisateurCourant() jeton: JetonAcces, @Body() corps: FavorisDto) {
    return this.panier.ajouterFavoris(jeton.sub, corps.produitIds);
  }

  @Delete('favoris/:produitId')
  retirerFavori(@UtilisateurCourant() jeton: JetonAcces, @Param('produitId', ParseUUIDPipe) produitId: string) {
    return this.panier.retirerFavori(jeton.sub, produitId);
  }
}
