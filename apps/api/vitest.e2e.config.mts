import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Tests d'intégration : base et Redis réels (docker compose up -d), lancés un fichier à la fois.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { tsconfigPaths: true },
  test: {
    name: 'api-e2e',
    globals: true,
    environment: 'node',
    include: ['src/**/*.e2e.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
