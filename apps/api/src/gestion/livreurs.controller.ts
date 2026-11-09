import { Body, Controller, Get, HttpStatus, Injectable, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { CaisseLivreur, EcritureLivreur, LivreurAdmin } from '@lce/contrats';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { Probleme } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Permission, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';
import { normaliserTelephone } from '../identite/telephone';

export class LivreurDto implements EcritureLivreur {
  @IsString() @Length(2, 120, { message: 'nom : entre 2 et 120 caractères' })
  nom!: string;

  @Transform(({ value }) => (typeof value === 'string' ? (normaliserTelephone(value) ?? '') : ''))
  @Matches(/^\+223\d{8}$/, { message: 'telephone : numéro malien à 8 chiffres attendu' })
  telephone!: string;

  @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true, message: 'zoneIds : zone invalide' })
  zoneIds!: string[];

  @IsOptional() @IsBoolean()
  disponible?: boolean;

  @IsOptional() @IsBoolean()
  actif?: boolean;
}

const INCLUSIONS = {
  utilisateur: { select: { id: true, nom: true, telephone: true, actif: true } },
  livreurZones: { include: { zone: { select: { id: true, nom: true } } } },
} satisfies Prisma.LivreurInclude;
type LivreurLu = Prisma.LivreurGetPayload<{ include: typeof INCLUSIONS }>;

const introuvable = () => new Probleme('livreur-introuvable', HttpStatus.NOT_FOUND, 'Livreur introuvable');

@Injectable()
export class LivreursService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(zoneId?: string): Promise<LivreurAdmin[]> {
    const livreurs = await this.prisma.livreur.findMany({
      where: { utilisateur: { supprimeLe: null }, ...(zoneId ? { livreurZones: { some: { zoneId } } } : {}) },
      include: INCLUSIONS,
    });
    const ids = livreurs.map((l) => l.utilisateurId);
    const [enCours, livrees, caisse] = await Promise.all([
      this.prisma.mission.groupBy({ by: ['livreurId'], where: { livreurId: { in: ids }, statut: { in: ['PROPOSEE', 'ACCEPTEE', 'EN_COURS'] } }, _count: true }),
      this.prisma.mission.groupBy({ by: ['livreurId'], where: { livreurId: { in: ids }, statut: 'LIVREE' }, _count: true }),
      this.prisma.encaissement.groupBy({ by: ['livreurId'], where: { livreurId: { in: ids }, statut: 'A_REVERSER' }, _sum: { montant: true } }),
    ]);
    const compte = (g: { livreurId: string; _count: number }[], id: string) => g.find((x) => x.livreurId === id)?._count ?? 0;
    return livreurs
      .map((l) => this.versAdmin(l, compte(enCours, l.utilisateurId), compte(livrees, l.utilisateurId), caisse.find((c) => c.livreurId === l.utilisateurId)?._sum.montant ?? 0))
      .sort((a, b) => Number(b.actif) - Number(a.actif) || Number(b.disponible) - Number(a.disponible) || a.nom.localeCompare(b.nom, 'fr'));
  }

  async creer(e: LivreurDto, acteurId: string): Promise<LivreurAdmin[]> {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { nom: 'Livreur' } });
    try {
      await this.prisma.$transaction(async (tx) => {
        // Sans mot de passe : le livreur le choisira dans son application, avec un code SMS.
        const u = await tx.utilisateur.create({ data: { nom: e.nom.trim(), telephone: e.telephone, roleId: role.id } });
        await tx.livreur.create({
          data: { utilisateurId: u.id, disponible: e.disponible ?? true, livreurZones: { create: e.zoneIds.map((zoneId) => ({ zoneId })) } },
        });
        await tx.journalAudit.create({ data: { acteurId, action: 'livreur.cree', entite: 'utilisateur', entiteId: u.id, apres: { nom: u.nom } } });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new Probleme('compte-existant', HttpStatus.CONFLICT, 'Ce numéro est déjà utilisé par un autre compte');
      }
      throw err;
    }
    return this.lister();
  }

  async modifier(id: string, e: LivreurDto, acteurId: string): Promise<LivreurAdmin[]> {
    const livreur = await this.prisma.livreur.findUnique({ where: { utilisateurId: id }, include: { utilisateur: true } });
    if (!livreur || livreur.utilisateur.supprimeLe) throw introuvable();
    if (e.actif === false) {
      const enCours = await this.prisma.mission.count({ where: { livreurId: id, statut: { in: ['PROPOSEE', 'ACCEPTEE', 'EN_COURS'] } } });
      if (enCours) throw new Probleme('livreur-occupe', HttpStatus.CONFLICT, `Ce livreur a encore ${enCours} livraison(s) en cours`);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.utilisateur.update({ where: { id }, data: { nom: e.nom.trim(), telephone: e.telephone, actif: e.actif ?? livreur.utilisateur.actif } });
        await tx.livreur.update({ where: { utilisateurId: id }, data: { disponible: e.actif === false ? false : (e.disponible ?? livreur.disponible) } });
        await tx.livreurZone.deleteMany({ where: { livreurId: id } });
        await tx.livreurZone.createMany({ data: e.zoneIds.map((zoneId) => ({ livreurId: id, zoneId })) });
        if (e.actif === false) await tx.jetonRafraichissement.updateMany({ where: { utilisateurId: id, revoqueLe: null }, data: { revoqueLe: new Date() } });
        await tx.journalAudit.create({ data: { acteurId, action: 'livreur.modifie', entite: 'utilisateur', entiteId: id, apres: { ...e } } });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new Probleme('compte-existant', HttpStatus.CONFLICT, 'Ce numéro est déjà utilisé par un autre compte');
      }
      throw err;
    }
    return this.lister();
  }

  async caisse(id: string): Promise<CaisseLivreur> {
    const livreur = (await this.lister()).find((l) => l.id === id);
    if (!livreur) throw introuvable();
    const [encaissements, reversements] = await Promise.all([
      this.prisma.encaissement.findMany({
        where: { livreurId: id },
        orderBy: { encaisseLe: 'desc' },
        take: 50,
        include: { mission: { select: { commande: { select: { numero: true } } } } },
      }),
      this.prisma.reversement.findMany({
        where: { livreurId: id },
        orderBy: { declareLe: 'desc' },
        take: 20,
        include: { validateur: { select: { nom: true } } },
      }),
    ]);
    return {
      livreur,
      encaissements: encaissements.map((e) => ({
        id: e.id,
        commande: e.mission.commande.numero,
        montant: e.montant,
        mode: e.mode,
        statut: e.statut,
        encaisseLe: e.encaisseLe.toISOString(),
      })),
      reversements: reversements.map((r) => ({
        id: r.id,
        livreur: livreur.nom,
        montant: r.montant,
        statut: r.statut,
        declareLe: r.declareLe.toISOString(),
        valideePar: r.validateur?.nom ?? null,
      })),
    };
  }

  /** Le livreur remet l'argent encaissé : tout ce qui était « à reverser » est soldé d'un coup. */
  async reverser(id: string, acteurId: string): Promise<CaisseLivreur> {
    await this.prisma.$transaction(async (tx) => {
      const aReverser = await tx.encaissement.findMany({ where: { livreurId: id, statut: 'A_REVERSER' }, select: { id: true, montant: true } });
      if (!aReverser.length) throw new Probleme('caisse-vide', HttpStatus.CONFLICT, 'Rien à reverser pour ce livreur');
      const montant = aReverser.reduce((s, e) => s + e.montant, 0);
      const maintenant = new Date();
      const r = await tx.reversement.create({
        data: { livreurId: id, montant, statut: 'REVERSE', declareLe: maintenant, valideePar: acteurId, valideeLe: maintenant },
      });
      const { count } = await tx.encaissement.updateMany({
        where: { id: { in: aReverser.map((e) => e.id) }, statut: 'A_REVERSER' },
        data: { statut: 'REVERSE', reversementId: r.id },
      });
      if (count !== aReverser.length) throw new Probleme('caisse-modifiee', HttpStatus.CONFLICT, 'La caisse vient de changer : rechargez puis réessayez');
      await tx.journalAudit.create({ data: { acteurId, action: 'caisse.reversement_valide', entite: 'reversement', entiteId: r.id, apres: { livreurId: id, montant } } });
    });
    return this.caisse(id);
  }

  private versAdmin(l: LivreurLu, enCours: number, livrees: number, aReverser: number): LivreurAdmin {
    return {
      id: l.utilisateurId,
      nom: l.utilisateur.nom,
      telephone: l.utilisateur.telephone,
      actif: l.utilisateur.actif,
      disponible: l.disponible,
      zones: l.livreurZones.map((z) => z.zone).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      enCours,
      livrees,
      aReverser,
    };
  }
}

/** Livreurs, leurs zones et l'argent qu'ils encaissent pour la boutique. */
@Controller('admin/livreurs')
export class LivreursController {
  constructor(private readonly service: LivreursService) {}

  @Get()
  @Permission('livreur.gerer')
  lister() {
    return this.service.lister();
  }

  /** Livreurs proposés à l'affectation d'une commande (actifs, éventuellement d'une zone). */
  @Get('choix')
  @Permission('commande.affecter')
  async choix(@Query('zoneId') zoneId?: string) {
    const tous = await this.service.lister();
    const actifs = tous.filter((l) => l.actif);
    const deLaZone = zoneId ? actifs.filter((l) => l.zones.some((z) => z.id === zoneId)) : [];
    return deLaZone.length ? deLaZone : actifs;
  }

  @Post()
  @Permission('livreur.gerer')
  creer(@Body() corps: LivreurDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.creer(corps, jeton.sub);
  }

  @Patch(':id')
  @Permission('livreur.gerer')
  modifier(@Param('id', ParseUUIDPipe) id: string, @Body() corps: LivreurDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.modifier(id, corps, jeton.sub);
  }

  @Get(':id/caisse')
  @Permission('livreur.gerer')
  caisse(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.caisse(id);
  }

  @Post(':id/reversements')
  @Permission('caisse.valider')
  reverser(@Param('id', ParseUUIDPipe) id: string, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.reverser(id, jeton.sub);
  }
}
