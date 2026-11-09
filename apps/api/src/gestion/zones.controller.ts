import { Body, Controller, Get, HttpStatus, Injectable, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { EcritureZone, ZoneAdmin } from '@lce/contrats';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { Probleme } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Permission, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';

export class ZoneDto implements EcritureZone {
  @IsString() @Length(2, 80, { message: 'nom : entre 2 et 80 caractères' })
  nom!: string;

  @IsInt({ message: 'frais : nombre entier en FCFA attendu' }) @Min(0) @Max(1_000_000)
  frais!: number;

  @IsInt({ message: 'delaiHeures : nombre d’heures attendu' }) @Min(1, { message: 'delaiHeures : 1 heure au minimum' }) @Max(720)
  delaiHeures!: number;

  @ValidateIf((_, v) => v !== null) @IsInt({ message: 'seuilGratuit : montant en FCFA attendu' }) @Min(0)
  seuilGratuit!: number | null;

  @IsOptional() @IsBoolean()
  actif!: boolean;
}

const nomPris = () => new Probleme('zone-existante', HttpStatus.CONFLICT, 'Une zone porte déjà ce nom');

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(): Promise<ZoneAdmin[]> {
    const zones = await this.prisma.zone.findMany({
      orderBy: [{ actif: 'desc' }, { frais: 'asc' }],
      include: { _count: { select: { livreurZones: true, commandes: true } } },
    });
    return zones.map(({ _count, ...z }) => ({ ...z, livreurs: _count.livreurZones, commandes: _count.commandes }));
  }

  async creer(e: ZoneDto, acteurId: string): Promise<ZoneAdmin[]> {
    try {
      const z = await this.prisma.zone.create({ data: { ...e, nom: e.nom.trim(), actif: e.actif ?? true } });
      await this.prisma.journalAudit.create({ data: { acteurId, action: 'zone.creee', entite: 'zone', entiteId: z.id, apres: { ...e } } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw nomPris();
      throw err;
    }
    return this.lister();
  }

  async modifier(id: string, e: ZoneDto, acteurId: string): Promise<ZoneAdmin[]> {
    const avant = await this.prisma.zone.findUnique({ where: { id } });
    if (!avant) throw new Probleme('zone-introuvable', HttpStatus.NOT_FOUND, 'Zone introuvable');
    try {
      await this.prisma.zone.update({ where: { id }, data: { ...e, nom: e.nom.trim(), actif: e.actif ?? avant.actif } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw nomPris();
      throw err;
    }
    await this.prisma.journalAudit.create({
      data: { acteurId, action: 'zone.modifiee', entite: 'zone', entiteId: id, avant: { frais: avant.frais, actif: avant.actif }, apres: { ...e } },
    });
    return this.lister();
  }
}

/** Zones de livraison et tarifs. Une zone désactivée n'est plus proposée au client. */
@Controller('admin/zones')
export class ZonesController {
  constructor(private readonly service: ZonesService) {}

  @Get()
  @Permission('zone.gerer')
  lister() {
    return this.service.lister();
  }

  @Post()
  @Permission('zone.gerer')
  creer(@Body() corps: ZoneDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.creer(corps, jeton.sub);
  }

  @Patch(':id')
  @Permission('zone.gerer')
  modifier(@Param('id', ParseUUIDPipe) id: string, @Body() corps: ZoneDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.modifier(id, corps, jeton.sub);
  }
}
