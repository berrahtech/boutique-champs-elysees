import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Erreur métier au format RFC 9457 (application/problem+json).
 * `code` devient le type `/problemes/<code>` : les clients s'appuient sur lui,
 * jamais sur le texte, qui peut changer.
 */
export class Probleme extends HttpException {
  constructor(
    readonly code: string,
    readonly statut: HttpStatus,
    readonly titre: string,
    readonly detail?: string,
    readonly extensions: Record<string, unknown> = {},
  ) {
    super(titre, statut);
  }
}

export const problemes = {
  donneesInvalides: (erreurs: string[]) =>
    new Probleme('donnees-invalides', HttpStatus.BAD_REQUEST, 'Données invalides', undefined, { erreurs }),
  nonAuthentifie: (detail?: string) =>
    new Probleme('non-authentifie', HttpStatus.UNAUTHORIZED, 'Authentification requise', detail),
  identifiantsInvalides: () =>
    new Probleme('identifiants-invalides', HttpStatus.UNAUTHORIZED, 'Numéro ou mot de passe incorrect'),
  permissionManquante: (permission: string) =>
    new Probleme('permission-manquante', HttpStatus.FORBIDDEN, "Vous n'avez pas accès à cette action", undefined, {
      permission,
    }),
  compteExistant: () =>
    new Probleme('compte-existant', HttpStatus.CONFLICT, 'Un compte existe déjà avec ce numéro'),
  compteInactif: () => new Probleme('compte-inactif', HttpStatus.FORBIDDEN, 'Ce compte est désactivé'),
  otpInvalide: (essaisRestants: number) =>
    new Probleme('otp-invalide', HttpStatus.BAD_REQUEST, 'Code incorrect', undefined, { essaisRestants }),
  otpExpire: () =>
    new Probleme('otp-expire', HttpStatus.BAD_REQUEST, 'Code expiré ou épuisé', 'Demandez un nouveau code.'),
  otpRequis: () =>
    new Probleme('otp-requis', HttpStatus.UNAUTHORIZED, 'Code de vérification requis', 'Un code a été envoyé par SMS.'),
  tropDeTentatives: (reessayerDansSecondes: number) =>
    new Probleme('trop-de-tentatives', HttpStatus.TOO_MANY_REQUESTS, 'Trop de tentatives', undefined, {
      reessayerDansSecondes,
    }),
};
