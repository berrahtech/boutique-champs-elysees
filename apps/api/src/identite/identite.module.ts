import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController, MoiController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasserelleEmail, PasserelleEmailSmtp } from './email/passerelle-email';
import { GardeAcces } from './gardes';
import { VerificateurGoogle, VerificateurGoogleReel } from './google/verificateur-google';
import { JetonsService } from './jetons.service';
import { OtpService } from './otp/otp.service';
import { PasserelleSms, PasserelleSmsConsole } from './sms/passerelle-sms';

/** Identité : codes SMS et e-mail, inscription, connexion (dont Google), sessions, permissions. */
@Module({
  controllers: [AuthController, MoiController],
  providers: [
    AuthService,
    JetonsService,
    OtpService,
    { provide: PasserelleSms, useClass: PasserelleSmsConsole },
    { provide: PasserelleEmail, useClass: PasserelleEmailSmtp },
    { provide: VerificateurGoogle, useClass: VerificateurGoogleReel },
    { provide: APP_GUARD, useClass: GardeAcces },
  ],
})
export class IdentiteModule {}
