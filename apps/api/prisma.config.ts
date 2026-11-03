import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Configuration Prisma 7 : l'URL de la base n'est plus dans schema.prisma.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
