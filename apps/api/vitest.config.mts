import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC compile les décorateurs NestJS (métadonnées comprises), ce que esbuild ne sait pas faire.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: 'api',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});
