// Lint config (ESLint flat config). Run with `npm run lint`; CI runs it on every push and pull request.
import js from '@eslint/js';
import globals from 'globals';

// The sim and everything the headless runner loads must stay DOM-free (see AGENTS.md), so these get no browser globals
const headless = ['src/sim/**', 'src/ai/**', 'src/rounds/**', 'src/data/**', 'src/tournament/**', 'src/gallery/rows.js'];

export default [
  { ignores: ['node_modules/', 'reports/', 'shots/', '_site/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  { files: ['**/*.js'], ignores: [...headless, 'serve.js', 'eslint.config.js', 'test/**'], languageOptions: { globals: globals.browser } },
  { files: headless, languageOptions: { globals: globals['shared-node-browser'] } },
  { files: ['src/tournament/worker.js'], languageOptions: { globals: globals.worker } },
  { files: ['serve.js', 'eslint.config.js', 'test/**'], languageOptions: { globals: globals.node } },
];
