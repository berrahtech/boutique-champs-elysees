import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Injectable, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { EcritureMembre, EcritureRole, MembrePersonnel, RoleAdmin, VuePersonnel } from '@lce/contrats';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, Length, Matches, ValidateIf } from 'class-validator';
import { Probleme } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { MESSAGE_MOT_DE_PASSE, MOT_DE_PASSE } from '../identite/dto';
import { Permission, UtilisateurCourant } from '../identite/gardes';
import type { JetonAcces } from '../identite/jetons.service';
import { hacherMotDePasse } from '../identite/mot-de-passe';
import { normaliserEmail, normaliserTelephone } from '../identite/telephone';

/** Rôles hors personnel : ils ont leur propre écran (clients, livreurs). */
const ROLES_HORS_PERSONNEL = ['Client', 'Livreur'];
/** Rôles dont les permissions ne bougent pas : le client, le livreur, et l'administrateur qui a tout. */
const ROLES_VERROUILLES = [...ROLES_HORS_PERSONNEL, 'Administrateur'];

const Telephone = () => Transform(({ value }) => (typeof value === 'string' ? (normaliserTelephone(value) ?? '') : ''));

export class CreationMembreDto implements EcritureMembre {
  @IsString() @Length(2, 120, { message: 'nom : entre 2 et 120 caractères' })
  nom!: string;

  @Telephone() @Matches(/^\+223\d{8}$/, { message: 'telephone : numéro malien à 8 chiffres attendu' })
  telephone!: string;

  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsEmail({}, { message: 'email : adresse invalide' })
  email?: string | null;

  @IsUUID('all', { message: 'roleId : choisissez un rôle' })
  roleId!: string;

  @Matches(MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  motDePasse!: string;
}

export class ModificationMembreDto {
  @IsString() @Length(2, 120, { message: 'nom : entre 2 et 120 caractères' })
  nom!: string;

  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsEmail({}, { message: 'email : adresse invalide' })
  email?: string | null;

  @IsUUID('all', { message: 'roleId : choisissez un rôle' })
  roleId!: string;

  @IsBoolean()
  actif!: boolean;

  @IsOptional() @Matches(MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  motDePasse?: string;
}

export class RoleDto implements EcritureRole {
  @IsString() @Length(2, 60, { message: 'nom : entre 2 et 60 caractères' })
  nom!: string;

  @IsArray() @ArrayMaxSize(60) @IsString({ each: true })
  permissions!: string[];
}

const doublon = () => new Probleme('compte-existant', HttpStatus.CONFLICT, 'Ce numéro ou cette adresse est déjà utilisé');

@Injectable()
export class PersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  async vue(): Promise<VuePersonnel> {
    const [membres, roles, permissions] = await Promise.all([
      this.prisma.utilisateur.findMany({
        where: { supprimeLe: null, role: { nom: { notIn: ROLES_HORS_PERSONNEL } } },
        include: { role: { select: { id: true, nom: true } } },
        orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
      }),
      this.roles(),
      this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] }),
    ]);
    return {
      membres: membres.map(
        (m): MembrePersonnel => ({ id: m.id, nom: m.nom, telephone: m.telephone, email: m.email, role: m.role, actif: m.actif, creeLe: m.creeLe.toISOString() }),
      ),
      roles,
      permissions,
    };
  }

  async roles(): Promise<RoleAdmin[]> {
    const roles = await this.prisma.role.findMany({
      where: { nom: { notIn: ROLES_HORS_PERSONNEL } },
      include: { rolePermissions: { select: { permissionCode: true } }, _count: { select: { utilisateurs: { where: { supprimeLe: null } } } } },
      orderBy: [{ systeme: 'desc' }, { nom: 'asc' }],
    });
    return roles.map((r) => ({
      id: r.id,
      nom: r.nom,
      systeme: r.systeme,
      verrouille: ROLES_VERROUILLES.includes(r.nom),
      permissions: r.rolePermissions.map((p) => p.permissionCode),
      membres: r._count.utilisateurs,
    }));
  }

  async creerMembre(e: CreationMembreDto, acteurId: string): Promise<VuePersonnel> {
    await this.rolePersonnel(e.roleId);
    const email = e.email ? normaliserEmail(e.email) : null;
    try {
      const m = await this.prisma.utilisateur.create({
        data: {
          nom: e.nom.trim(),
          telephone: e.telephone,
          email,
          // Adresse saisie par l'administration : elle sert aussi à recevoir les codes de connexion.
          emailVerifieLe: email ? new Date() : null,
          roleId: e.roleId,
          motDePasseHash: await hacherMotDePasse(e.motDePasse),
          deuxFacteurs: true,
        },
      });
      await this.prisma.journalAudit.create({
        data: { acteurId, action: 'personnel.cree', entite: 'utilisateur', entiteId: m.id, apres: { nom: m.nom, roleId: e.roleId } },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw doublon();
      throw err;
    }
    return this.vue();
  }

  async modifierMembre(id: string, e: ModificationMembreDto, acteurId: string): Promise<VuePersonnel> {
    const avant = await this.prisma.utilisateur.findFirst({ where: { id, supprimeLe: null }, include: { role: true } });
    if (!avant || ROLES_HORS_PERSONNEL.includes(avant.role.nom)) throw new Probleme('membre-introuvable', HttpStatus.NOT_FOUND, 'Membre introuvable');
    const role = await this.rolePersonnel(e.roleId);

    if (id === acteurId && (!e.actif || role.id !== avant.roleId)) {
      throw new Probleme('modification-soi', HttpStatus.CONFLICT, 'Vous ne pouvez pas désactiver ni changer votre propre rôle');
    }
    // L'administration ne doit jamais se retrouver sans administrateur actif.
    if (avant.role.nom === 'Administrateur' && avant.actif && (!e.actif || role.nom !== 'Administrateur')) {
      const autres = await this.prisma.utilisateur.count({
        where: { id: { not: id }, actif: true, supprimeLe: null, role: { nom: 'Administrateur' } },
      });
      if (!autres) throw new Probleme('dernier-administrateur', HttpStatus.CONFLICT, 'Il faut au moins un administrateur actif');
    }

    const email = e.email ? normaliserEmail(e.email) : null;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.utilisateur.update({
          where: { id },
          data: {
            nom: e.nom.trim(),
            email,
            emailVerifieLe: email ? (email === avant.email ? avant.emailVerifieLe : new Date()) : null,
            roleId: e.roleId,
            actif: e.actif,
            ...(e.motDePasse ? { motDePasseHash: await hacherMotDePasse(e.motDePasse) } : {}),
          },
        });
        // Accès retiré ou changé : les sessions ouvertes sont fermées tout de suite.
        if (!e.actif || role.id !== avant.roleId || e.motDePasse) {
          await tx.jetonRafraichissement.updateMany({ where: { utilisateurId: id, revoqueLe: null }, data: { revoqueLe: new Date() } });
        }
        await tx.journalAudit.create({
          data: {
            acteurId,
            action: 'personnel.modifie',
            entite: 'utilisateur',
            entiteId: id,
            avant: { roleId: avant.roleId, actif: avant.actif },
            apres: { roleId: e.roleId, actif: e.actif, motDePasseChange: !!e.motDePasse },
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw doublon();
      throw err;
    }
    return this.vue();
  }

  async creerRole(e: RoleDto, acteurId: string): Promise<RoleAdmin[]> {
    const permissions = await this.permissionsValides(e.permissions);
    try {
      const r = await this.prisma.role.create({
        data: { nom: e.nom.trim(), rolePermissions: { create: permissions.map((permissionCode) => ({ permissionCode })) } },
      });
      await this.prisma.journalAudit.create({ data: { acteurId, action: 'role.cree', entite: 'role', entiteId: r.id, apres: { nom: r.nom, permissions } } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new Probleme('role-existant', HttpStatus.CONFLICT, 'Un rôle porte déjà ce nom');
      }
      throw err;
    }
    return this.roles();
  }

  async modifierRole(id: string, e: RoleDto, acteurId: string): Promise<RoleAdmin[]> {
    const role = await this.roleModifiable(id);
    const permissions = await this.permissionsValides(e.permissions);
    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id }, data: { nom: role.systeme ? role.nom : e.nom.trim() } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({ data: permissions.map((permissionCode) => ({ roleId: id, permissionCode })) });
      await tx.journalAudit.create({ data: { acteurId, action: 'role.modifie', entite: 'role', entiteId: id, apres: { permissions } } });
    });
    return this.roles();
  }

  async supprimerRole(id: string, acteurId: string): Promise<void> {
    const role = await this.roleModifiable(id);
    if (role.systeme) throw new Probleme('role-systeme', HttpStatus.CONFLICT, 'Les rôles d’origine ne se suppriment pas');
    const membres = await this.prisma.utilisateur.count({ where: { roleId: id, supprimeLe: null } });
    if (membres) throw new Probleme('role-utilise', HttpStatus.CONFLICT, `Ce rôle est attribué à ${membres} personne(s)`);
    await this.prisma.role.delete({ where: { id } });
    await this.prisma.journalAudit.create({ data: { acteurId, action: 'role.supprime', entite: 'role', entiteId: id, avant: { nom: role.nom } } });
  }

  private async rolePersonnel(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role || ROLES_HORS_PERSONNEL.includes(role.nom)) throw new Probleme('role-invalide', HttpStatus.BAD_REQUEST, 'Choisissez un rôle du personnel');
    return role;
  }

  private async roleModifiable(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new Probleme('role-introuvable', HttpStatus.NOT_FOUND, 'Rôle introuvable');
    if (ROLES_VERROUILLES.includes(role.nom)) throw new Probleme('role-verrouille', HttpStatus.CONFLICT, 'Ce rôle ne se modifie pas');
    return role;
  }

  private async permissionsValides(codes: string[]): Promise<string[]> {
    const connues = await this.prisma.permission.findMany({ where: { code: { in: codes } }, select: { code: true } });
    if (connues.length !== new Set(codes).size) throw new Probleme('permission-inconnue', HttpStatus.BAD_REQUEST, 'Permission inconnue');
    return connues.map((p) => p.code);
  }
}

/** Personnel (comptes de l'équipe) et rôles. Un changement de droits prend effet à la prochaine connexion. */
@Controller('admin')
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Get('personnel')
  @Permission('utilisateur.gerer')
  vue() {
    return this.service.vue();
  }

  @Post('personnel')
  @Permission('utilisateur.gerer')
  creer(@Body() corps: CreationMembreDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.creerMembre(corps, jeton.sub);
  }

  @Patch('personnel/:id')
  @Permission('utilisateur.gerer')
  modifier(@Param('id', ParseUUIDPipe) id: string, @Body() corps: ModificationMembreDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.modifierMembre(id, corps, jeton.sub);
  }

  @Post('roles')
  @Permission('role.gerer')
  creerRole(@Body() corps: RoleDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.creerRole(corps, jeton.sub);
  }

  @Patch('roles/:id')
  @Permission('role.gerer')
  modifierRole(@Param('id', ParseUUIDPipe) id: string, @Body() corps: RoleDto, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.modifierRole(id, corps, jeton.sub);
  }

  @Delete('roles/:id')
  @Permission('role.gerer')
  @HttpCode(HttpStatus.NO_CONTENT)
  supprimerRole(@Param('id', ParseUUIDPipe) id: string, @UtilisateurCourant() jeton: JetonAcces) {
    return this.service.supprimerRole(id, jeton.sub);
  }
}
