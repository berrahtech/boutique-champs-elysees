import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from './prisma/prisma.service';
import { Magasin, MagasinRedis } from './redis/magasin';

const REDIS = Symbol('REDIS');

/** Services techniques partagés par tous les modules : base, Redis. */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('redisUrl'), { maxRetriesPerRequest: 2 }),
    },
    { provide: Magasin, inject: [REDIS], useFactory: (redis: Redis) => new MagasinRedis(redis) },
  ],
  exports: [PrismaService, Magasin],
})
export class CommunModule implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
