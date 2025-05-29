import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier'; // disables ESLint rules that conflict with Prettier
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      js,
    },
    extends: [
      'js/recommended',
      prettier, // must come last to override conflicting rules
    ],
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      indent: ['error', 2],
      semi: ['error', 'always'],
      quotes: [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: true },
      ],
    },
  },
]);
