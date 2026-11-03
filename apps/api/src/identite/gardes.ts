import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { problemes } from '../commun/erreurs/probleme';
import { JetonAcces } from './jetons.service';

const PUBLIC = 'lce:public';
const PERMISSION = 'lce:permission';

/** Route accessible sans connexion. Par défaut, toute route exige un jeton. */
export const Public = () => SetMetadata(PUBLIC, true);

/** Route réservée aux rôles qui ont cette permission, ex. @Permission('commande.affecter'). */
export const Permission = (code: string) => SetMetadata(PERMISSION, code);

type RequeteAuthentifiee = Request & { utilisateur?: JetonAcces };

/** Injecte le contenu du jeton d'accès de l'utilisateur connecté. */
export const UtilisateurCourant = createParamDecorator(
  (_: unknown, contexte: ExecutionContext) => contexte.switchToHttp().getRequest<RequeteAuthentifiee>().utilisateur,
);

/**
 * Garde globale : vérifie le jeton d'accès (Authorization: Bearer …), puis la
 * permission demandée par @Permission.
 */
@Injectable()
export class GardeAcces implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const cibles = [contexte.getHandler(), contexte.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, cibles)) return true;

    const requete = contexte.switchToHttp().getRequest<RequeteAuthentifiee>();
    const [schema, jeton] = (requete.headers.authorization ?? '').split(' ');
    if (schema !== 'Bearer' || !jeton) throw problemes.nonAuthentifie();
    try {
      const contenu = await this.jwt.verifyAsync<JetonAcces & { typ?: string }>(jeton);
      if (contenu.typ) throw new Error('pas un jeton d’accès');
      requete.utilisateur = contenu;
    } catch {
      throw problemes.nonAuthentifie('Session expirée');
    }

    const permission = this.reflector.getAllAndOverride<string>(PERMISSION, cibles);
    if (permission && !requete.utilisateur.permissions.includes(permission)) {
      throw problemes.permissionManquante(permission);
    }
    return true;
  }
}
