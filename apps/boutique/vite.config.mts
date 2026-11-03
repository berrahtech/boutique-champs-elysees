/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/boutique',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular({ inlineStylesExtension: 'scss' })],
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [import.meta.dirname + "/../../libs/ui/src/styles"] },
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  test: {
    name: 'boutique',
    watch: false,
    // Le cache disque de Vitest perd les styles en ligne des composants Angular
    // (modules virtuels d’Analog) au 2e lancement : désactivé.
    fsModuleCache: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/boutique',
      provider: 'v8' as const,
    },
  },
}));
