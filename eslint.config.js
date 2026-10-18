import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // Engine must stay game-agnostic (CLAUDE.md conventions).
      'no-restricted-imports': 'off',
    },
  },
  {
    // Build-time code runs in Node, not the browser.
    files: ['build/**/*.ts', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/game/**'] }],
    },
  },
);
