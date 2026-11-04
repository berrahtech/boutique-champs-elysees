import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import helmet from 'helmet';
import { problemes } from './commun/erreurs/probleme';
import { ProblemeFilter } from './commun/erreurs/probleme.filter';

/** Réglages communs à l'application et aux tests de bout en bout. */
export function configurerApplication<T extends NestExpressApplication>(app: T): T {
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  // Photos produit. En production, elles viendront de S3 derrière le CDN.
  app.useStaticAssets(resolve(app.get(ConfigService).get<string>('mediasDossier') ?? 'medias'), { prefix: '/medias', maxAge: '30d' });
  app.useGlobalFilters(new ProblemeFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (erreurs) =>
        problemes.donneesInvalides(erreurs.flatMap((e) => Object.values(e.constraints ?? {}))),
    }),
  );
  return app;
}
