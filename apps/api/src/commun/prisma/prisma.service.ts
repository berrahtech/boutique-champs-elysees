import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    const url = new URL(config.getOrThrow<string>('databaseUrl'));
    const schema = url.searchParams.get('schema') ?? 'lce';
    url.searchParams.delete('schema');
    super({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
