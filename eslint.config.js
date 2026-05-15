import js from '@eslint/js'
import globals from 'globals'
import importX from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import testingLibrary from 'eslint-plugin-testing-library'
import vitest from 'eslint-plugin-vitest'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'coverage',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'import-x': importX,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2023,
      },
    },
    rules: {
      'import-x/no-duplicates': 'error',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    plugins: {
      vitest,
      'testing-library': testingLibrary,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2023,
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      ...testingLibrary.configs.react.rules,
    },
  },
  {
    files: ['*.config.{js,ts,cjs}', 'playwright.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2023,
      },
    },
  },
])
