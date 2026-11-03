import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import type { ObjetOtp } from './otp/otp.service';
import { normaliserTelephone } from './telephone';

// Le numéro est normalisé en +223XXXXXXXX avant validation ; une saisie invalide devient ''.
const TelephoneMalien = () => Transform(({ value }) => (typeof value === 'string' ? (normaliserTelephone(value) ?? '') : ''));
const MESSAGE_TELEPHONE = 'telephone : numéro malien à 8 chiffres attendu';

// 8 caractères minimum, avec au moins une lettre et un chiffre.
const MOT_DE_PASSE = /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,128}$/;
const MESSAGE_MOT_DE_PASSE = 'motDePasse : 8 caractères minimum, avec au moins une lettre et un chiffre';

export class DemandeOtpDto {
  @TelephoneMalien()
  @Matches(/^\+223\d{8}$/, { message: MESSAGE_TELEPHONE })
  telephone!: string;

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
  @TelephoneMalien()
  @Matches(/^\+223\d{8}$/, { message: MESSAGE_TELEPHONE })
  telephone!: string;

  @IsString({ message: 'motDePasse : obligatoire' })
  @MaxLength(128, { message: 'motDePasse : 128 caractères au plus' })
  motDePasse!: string;

  /** Code SMS, exigé pour les comptes avec double authentification (personnel). */
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'code : 6 chiffres attendus' })
  code?: string;
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
