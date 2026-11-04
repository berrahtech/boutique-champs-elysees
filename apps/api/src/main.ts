import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { configurerApplication } from './application';

async function demarrer() {
  const app = configurerApplication(await NestFactory.create<NestExpressApplication>(AppModule));
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get<string[]>('originesAutorisees') });
  app.enableShutdownHooks();
  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  // Signal attendu par `nx serve` pour savoir que le serveur est prêt.
  if (process.env['NX_READY_SIGNAL_SOCKET']) {
    try {
      const charger = new Function('s', 'return import(s)') as (s: string) => Promise<{ emitReadySignal(serveur: unknown): boolean }>;
      (await charger('@nx/js/ready-signal')).emitReadySignal(app.getHttpServer());
    } catch {
      // @nx/js absent : rien à signaler.
    }
  }
  Logger.log(`API prête sur http://localhost:${port}/api/v1`);
}

void demarrer();
