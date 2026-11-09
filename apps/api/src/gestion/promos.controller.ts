import { Body, Controller, Get, HttpStatus, Injectable, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { CodePromoAdmin, EcritureCodePromo, TypeRemise } from '@lce/contrats';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsUUID, Matches, Max, Min, ValidateIf } from 'class-validator';
import { Probleme } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Permission, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';

export class CodePromoDto implements EcritureCodePromo {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9_-]{3,30}$/, { message: 'code : 3 à 30 lettres, chiffres, - ou _' })
  code!: string;

  @IsIn(['POURCENTAGE', 'MONTANT_FIXE', 'LIVRAISON_OFFERTE'], { message: 'type : type de remise inconnu' })
  type!: TypeRemise;

  @IsInt({ message: 'valeur : nombre entier attendu' }) @Min(0) @Max(10_000_000)
  valeur!: number;

  @ValidateIf((_, v) => v !== null) @IsUUID('all', { message: 'categorieId : catégorie invalide' })
  categorieId!: string | null;

  @IsInt() @Min(0)
  montantMinimum!: number;

  @IsDateString({}, { message: 'debut : date attendue' })
  debut!: string;

  @IsDateString({}, { message: 'fin : date attendue' })
  fin!: string;

  @ValidateIf((_, v) => v !== null) @IsInt() @Min(1, { message: 'utilisationsMax : 1 au minimum' })
  utilisationsMax!: number | null;

  @IsBoolean()
  actif!: boolean;
}

const INCLUSIONS = { categorie: { select: { id: true, nom: true } } } satisfies Prisma.CodePromoInclude;
type CodeLu = Prisma.CodePromoGetPayload<{ include: typeof INCLUSIONS }>;

function versAdmin(c: CodeLu, maintenant: Date): CodePromoAdmin {
  const etat: CodePromoAdmin['etat'] = !c.actif
    ? 'desactive'
    : maintenant < c.debut
      ? 'programme'
      : maintenant > c.fin
        ? 'expire'
        : c.utilisationsMax != null && c.utilisations >= c.utilisationsMax
          ? 'epuise'
          : 'actif';
  return { ...c, debut: c.debut.toISOString(), fin: c.fin.toISOString(), etat };
}

/** Vérifie ce que la base refuserait, avec un message lisible. */
function verifier(e: CodePromoDto): void {
  if (new Date(e.fin) <= new Date(e.debut)) throw new Probleme('periode-invalide', HttpStatus.BAD_REQUEST, 'La fin doit être après le début');
  if (e.type === 'POURCENTAGE' && (e.valeur < 1 || e.valeur > 100)) {
    throw new Probleme('valeur-invalide', HttpStatus.BAD_REQUEST, 'Le pourcentage doit être entre 1 et 100');
  }
  if (e.type === 'MONTANT_FIXE' && e.valeur < 1) throw new Probleme('valeur-invalide', HttpStatus.BAD_REQUEST, 'Indiquez le montant de la remise');
}

function donnees(e: CodePromoDto) {
  return {
    code: e.code,
    type: e.type,
    valeur: e.type === 'LIVRAISON_OFFERTE' ? 0 : e.valeur,
    categorieId: e.categorieId,
    montantMinimum: e.montantMinimum,
    debut: new Date(e.debut),
    fin: new Date(e.fin),
    utilisationsMax: e.utilisationsMax,
    actif: e.actif,
  };
}

const codePris = () => new Probleme('code-existant', HttpStatus.CONFLICT, 'Ce code existe déjà');

@Injectable()
export class PromosService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(): Promise<CodePromoAdmin[]> {
    const codes = await this.prisma.codePromo.findMany({ include: INCLUSIONS, orderBy: [{ actif: 'desc' }, { fin: 'desc' }] });
    const maintenant = new Date();
    return codes.map((c) => versAdmin(c, maintenant));
  }

  async creer(e: CodePromoDto, acteurId: string): Promise<CodePromoAdmin[]> {
    verifier(e);
    try {
      const c = await this.prisma.codePromo.create({ data: donnees(e) });
      await this.prisma.journalAudit.create({ data: { acteurId, action: 'promo.creee', entite: 'code_promo', entiteId: c.id, apres: { ...e } } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw codePris();
      throw err;
    }
    return this.lister();
  }

  async modifier(id: string, e: CodePromoDto, acteurId: string): Promise<CodePromoAdmin[]> {
    verifier(e);
    const avant = await this.prisma.codePromo.findUnique({ where: { id } });
    if (!avant) throw new Probleme('code-introuvable', HttpStatus.NOT_FOUND, 'Code promo introuvable');
    if (e.utilisationsMax != null && e.utilisationsMax < avant.utilisations) {
      throw new Probleme('plafond-invalide', HttpStatus.BAD_REQUEST, `Ce code a déjà servi ${avant.utilisations} fois`);
    }
    try {
      await this.prisma.codePromo.update({ where: { id }, data: donnees(e) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw codePris();
      throw err;
    }
    await this.prisma.journalAudit.create({
      data: { acteurId, action: 'promo.modifiee', entite: 'code_promo', entiteId: id, avant: { actif: avant.actif, valeur: avant.valeur }, apres: { ...e } },
    });
    return this.lister();
  }
}

/** Codes promo, appliqués par le calcul du panier. */
@Controller('admin/promos')
export class PromosController {
  constructor(private readonly service: PromosService) {}

  @Get()
  @Permission('promo.gerer')
  lister() {
    return this.service.lister();
  }

  @Post()
  @Permission('promo.gerer')
  creer(@Body() corps: CodePromoDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.creer(corps, jeton.sub);
  }

  @Patch(':id')
  @Permission('promo.gerer')
  modifier(@Param('id', ParseUUIDPipe) id: string, @Body() corps: CodePromoDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.modifier(id, corps, jeton.sub);
  }
}
