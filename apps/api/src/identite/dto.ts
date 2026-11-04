import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import type { ObjetOtp } from './otp/otp.service';
import { normaliserIdentifiant } from './telephone';

// Téléphone ou e-mail, ramené à sa forme canonique avant validation ; une saisie invalide devient ''.
const Identifiant = () => Transform(({ value }) => (typeof value === 'string' ? (normaliserIdentifiant(value) ?? '') : ''));
const IDENTIFIANT_VALIDE = /^(\+223\d{8}|[^\s@]+@[^\s@]+)$/;
const MESSAGE_IDENTIFIANT = 'identifiant : numéro malien à 8 chiffres ou adresse e-mail attendu';

// 8 caractères minimum, avec au moins une lettre et un chiffre.
const MOT_DE_PASSE = /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,128}$/;
const MESSAGE_MOT_DE_PASSE = 'motDePasse : 8 caractères minimum, avec au moins une lettre et un chiffre';

export class DemandeOtpDto {
  @Identifiant()
  @Matches(IDENTIFIANT_VALIDE, { message: MESSAGE_IDENTIFIANT })
  identifiant!: string;

  @IsIn(['INSCRIPTION', 'CONNEXION', 'MOT_DE_PASSE'], { message: 'objet : INSCRIPTION, CONNEXION ou MOT_DE_PASSE' })
  objet!: ObjetOtp;
}

export class VerificationOtpDto extends DemandeOtpDto {
  @Matches(/^\d{6}$/, { message: 'code : 6 chiffres attendus' })
  code!: string;
}

export class InscriptionDto {
  @IsString({ message: 'preuveOtp : obligatoire' })
  preuveOtp!: string;

  @IsString({ message: 'nom : obligatoire' })
  @Length(2, 120, { message: 'nom : entre 2 et 120 caractères' })
  nom!: string;

  @Matches(MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  motDePasse!: string;

  @IsOptional()
  @IsEmail({}, { message: 'email : adresse invalide' })
  @MaxLength(254, { message: 'email : 254 caractères au plus' })
  email?: string;
}

export class ConnexionDto {
  @Identifiant()
  @Matches(IDENTIFIANT_VALIDE, { message: MESSAGE_IDENTIFIANT })
  identifiant!: string;

  @IsString({ message: 'motDePasse : obligatoire' })
  @MaxLength(128, { message: 'motDePasse : 128 caractères au plus' })
  motDePasse!: string;

  /** Code SMS, exigé pour les comptes avec double authentification (personnel). */
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'code : 6 chiffres attendus' })
  code?: string;
}

export class ConnexionGoogleDto {
  @IsString({ message: 'jeton : obligatoire' })
  @MaxLength(4096, { message: 'jeton : trop long' })
  jeton!: string;
}

export class RafraichissementDto {
  @IsString({ message: 'jetonRafraichissement : obligatoire' })
  jetonRafraichissement!: string;
}

export class ReinitialisationDto {
  @IsString({ message: 'preuveOtp : obligatoire' })
  preuveOtp!: string;

  @Matches(MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  motDePasse!: string;
}
