import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { problemes } from './commun/erreurs/probleme';
import { ProblemeFilter } from './commun/erreurs/probleme.filter';

/** Réglages communs à l'application et aux tests de bout en bout. */
export function configurerApplication<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
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
