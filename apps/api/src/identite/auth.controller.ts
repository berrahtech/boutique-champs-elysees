import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PrismaService } from '../commun/prisma/prisma.service';
import { AuthService } from './auth.service';
import { ConnexionDto, ConnexionGoogleDto, DemandeOtpDto, InscriptionDto, RafraichissementDto, ReinitialisationDto, VerificationOtpDto } from './dto';
import { Public, UtilisateurCourant } from './gardes';
import { JetonAcces, JetonsService } from './jetons.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jetons: JetonsService,
  ) {}

  /** Moyens de connexion disponibles, pour l'affichage. */
  @Public()
  @Get('options')
  options() {
    return this.auth.options();
  }

  /** Envoie un code par SMS ou par e-mail. Réponse identique que le compte existe ou non (sauf inscription). */
  @Public()
  @Post('otp')
  @HttpCode(HttpStatus.ACCEPTED)
  async demanderOtp(@Body() corps: DemandeOtpDto) {
    await this.auth.demanderOtp(corps);
    return { message: 'Si ce compte est concerné, un code a été envoyé.' };
  }

  /** Vérifie le code et renvoie une preuve à usage unique, valable 10 minutes. */
  @Public()
  @Post('otp/verifier')
  @HttpCode(HttpStatus.OK)
  verifierOtp(@Body() corps: VerificationOtpDto) {
    return this.auth.verifierOtp(corps);
  }

  @Public()
  @Post('inscription')
  inscrire(@Body() corps: InscriptionDto) {
    return this.auth.inscrire(corps);
  }

  @Public()
  @Post('connexion')
  @HttpCode(HttpStatus.OK)
  connecter(@Body() corps: ConnexionDto) {
    return this.auth.connecter(corps);
  }

  /** Connexion ou inscription avec le jeton d'identité du bouton Google. */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  connecterAvecGoogle(@Body() corps: ConnexionGoogleDto) {
    return this.auth.connecterAvecGoogle(corps.jeton);
  }

  @Public()
  @Post('rafraichir')
  @HttpCode(HttpStatus.OK)
  rafraichir(@Body() corps: RafraichissementDto) {
    return this.jetons.rafraichir(corps.jetonRafraichissement);
  }

  @Public()
  @Post('deconnexion')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deconnecter(@Body() corps: RafraichissementDto) {
    await this.jetons.revoquer(corps.jetonRafraichissement);
  }

  @Public()
  @Post('mot-de-passe/reinitialiser')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reinitialiser(@Body() corps: ReinitialisationDto) {
    await this.auth.reinitialiserMotDePasse(corps);
  }
}

@Controller('moi')
export class MoiController {
  constructor(private readonly prisma: PrismaService) {}

  /** Profil de l'utilisateur connecté et ses permissions (pour afficher le bon menu). */
  @Get()
  async profil(@UtilisateurCourant() jeton: JetonAcces) {
    const utilisateur = await this.prisma.utilisateur.findUniqueOrThrow({
      where: { id: jeton.sub },
      select: { id: true, nom: true, telephone: true, email: true, deuxFacteurs: true },
    });
    return { ...utilisateur, role: jeton.role, permissions: jeton.permissions };
  }
}
