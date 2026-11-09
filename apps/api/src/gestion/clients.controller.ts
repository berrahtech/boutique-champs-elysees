import { Body, Controller, Get, HttpStatus, Injectable, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import type { ClientAdmin, ClientAdminDetail, ListeClientsAdmin } from '@lce/contrats';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Probleme } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Permission, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';

const PAR_PAGE = 20;

class CriteresClientsDto {
  @IsOptional() @IsString() @MaxLength(80)
  q?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;
}

class EtatClientDto {
  @IsBoolean()
  actif!: boolean;
}

type ClientLu = { id: string; nom: string; telephone: string | null; email: string | null; actif: boolean; creeLe: Date };

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(c: CriteresClientsDto): Promise<ListeClientsAdmin> {
    const page = c.page ?? 1;
    const q = c.q?.trim();
    const where: Prisma.UtilisateurWhereInput = {
      supprimeLe: null,
      role: { nom: 'Client' },
      ...(q
        ? {
            OR: [
              { nom: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { telephone: { contains: q.replace(/\s/g, '') } },
            ],
          }
        : {}),
    };
    const [total, clients] = await Promise.all([
      this.prisma.utilisateur.count({ where }),
      this.prisma.utilisateur.findMany({
        where,
        orderBy: { creeLe: 'desc' },
        skip: (page - 1) * PAR_PAGE,
        take: PAR_PAGE,
        select: { id: true, nom: true, telephone: true, email: true, actif: true, creeLe: true },
      }),
    ]);
    return { clients: await this.enrichir(clients), total, page, pages: Math.max(1, Math.ceil(total / PAR_PAGE)) };
  }

  async lire(id: string): Promise<ClientAdminDetail> {
    const client = await this.prisma.utilisateur.findFirst({
      where: { id, supprimeLe: null, role: { nom: 'Client' } },
      select: { id: true, nom: true, telephone: true, email: true, actif: true, creeLe: true },
    });
    if (!client) throw new Probleme('client-introuvable', HttpStatus.NOT_FOUND, 'Client introuvable');
    const [resume] = await this.enrichir([client]);
    const commandes = await this.prisma.commande.findMany({
      where: { clientId: id },
      orderBy: { creeLe: 'desc' },
      take: 50,
      include: { lignes: { select: { quantite: true } }, zone: { select: { nom: true } } },
    });
    // Le carnet d'adresses se déduit des commandes : une ligne par quartier et repère distincts.
    const vues = new Set<string>();
    const adresses = commandes.flatMap((c) => {
      const a = c.adresse as Record<string, string>;
      const cle = `${c.zoneId}|${a['quartier']}|${a['repere']}`;
      if (vues.has(cle)) return [];
      vues.add(cle);
      return [{ libelle: a['nom'] ?? '', zone: c.zone.nom, quartier: a['quartier'] ?? '', repere: a['repere'] ?? '' }];
    });
    return {
      ...resume,
      historique: commandes.map((c) => ({
        id: c.id,
        numero: c.numero,
        statut: c.statut,
        moyen: c.moyen,
        total: c.total,
        nbArticles: c.lignes.reduce((n, l) => n + l.quantite, 0),
        creeLe: c.creeLe.toISOString(),
      })),
      adresses: adresses.slice(0, 5),
    };
  }

  async changerEtat(id: string, actif: boolean, acteurId: string): Promise<ClientAdminDetail> {
    const { count } = await this.prisma.utilisateur.updateMany({ where: { id, supprimeLe: null, role: { nom: 'Client' } }, data: { actif } });
    if (!count) throw new Probleme('client-introuvable', HttpStatus.NOT_FOUND, 'Client introuvable');
    if (!actif) await this.prisma.jetonRafraichissement.updateMany({ where: { utilisateurId: id, revoqueLe: null }, data: { revoqueLe: new Date() } });
    await this.prisma.journalAudit.create({ data: { acteurId, action: actif ? 'client.reactive' : 'client.desactive', entite: 'utilisateur', entiteId: id } });
    return this.lire(id);
  }

  private async enrichir(clients: ClientLu[]): Promise<ClientAdmin[]> {
    const ids = clients.map((c) => c.id);
    const [toutes, livrees] = await Promise.all([
      this.prisma.commande.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _count: true, _max: { creeLe: true } }),
      this.prisma.commande.groupBy({ by: ['clientId'], where: { clientId: { in: ids }, statut: 'LIVREE' }, _sum: { total: true } }),
    ]);
    return clients.map((c) => {
      const t = toutes.find((x) => x.clientId === c.id);
      return {
        ...c,
        creeLe: c.creeLe.toISOString(),
        commandes: t?._count ?? 0,
        depense: livrees.find((x) => x.clientId === c.id)?._sum.total ?? 0,
        derniereCommande: t?._max.creeLe?.toISOString() ?? null,
      };
    });
  }
}

@Controller('admin/clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Permission('client.voir')
  lister(@Query() criteres: CriteresClientsDto) {
    return this.service.lister(criteres);
  }

  @Get(':id')
  @Permission('client.voir')
  lire(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.lire(id);
  }

  @Patch(':id')
  @Permission('utilisateur.gerer')
  changerEtat(@Param('id', ParseUUIDPipe) id: string, @Body() corps: EtatClientDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.changerEtat(id, corps.actif, jeton.sub);
  }
}
