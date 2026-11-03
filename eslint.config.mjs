import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // scope:web = boutique et admin, scope:api = serveur, scope:partage = utilisable partout.
          depConstraints: [
            { sourceTag: 'scope:partage', onlyDependOnLibsWithTags: ['scope:partage'] },
            { sourceTag: 'scope:web', onlyDependOnLibsWithTags: ['scope:web', 'scope:partage'] },
            { sourceTag: 'scope:api', onlyDependOnLibsWithTags: ['scope:api', 'scope:partage'] },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
