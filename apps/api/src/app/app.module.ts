import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { CommunModule } from '../commun/commun.module';
import { PrismaService } from '../commun/prisma/prisma.service';
import { validerConfiguration } from '../config/configuration';
import { Public } from '../identite/gardes';
import { IdentiteModule } from '../identite/identite.module';

@Controller('sante')
class SanteController {
  constructor(private readonly prisma: PrismaService) {}

  /** Sonde de supervision : l'API répond et joint la base. */
  @Public()
  @Get()
  async sante() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { statut: 'ok' };
  }
}

@Module({
  imports: [
    // .env cherché depuis la racine du dépôt (nx) puis depuis apps/api.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['apps/api/.env', '.env'], validate: validerConfiguration }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwtSecret'),
        signOptions: { issuer: 'lce-api' },
        verifyOptions: { issuer: 'lce-api', algorithms: ['HS256'] },
      }),
    }),
    CommunModule,
    IdentiteModule,
    CatalogueModule,
  ],
  controllers: [SanteController],
})
export class AppModule {}
