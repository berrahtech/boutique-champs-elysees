import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController, MoiController } from './auth.controller';
import { AuthService } from './auth.service';
import { GardeAcces } from './gardes';
import { JetonsService } from './jetons.service';
import { OtpService } from './otp/otp.service';
import { PasserelleSms, PasserelleSmsConsole } from './sms/passerelle-sms';

/** Identité : codes SMS, inscription, connexion, sessions, permissions. */
@Module({
  controllers: [AuthController, MoiController],
  providers: [
    AuthService,
    JetonsService,
    OtpService,
    { provide: PasserelleSms, useClass: PasserelleSmsConsole },
    { provide: APP_GUARD, useClass: GardeAcces },
  ],
})
export class IdentiteModule {}
