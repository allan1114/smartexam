import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Flat config (ESLint 9). Lives at the repo root because the real source is in
 * packages/core — the previous `lint` script ran inside packages/web, whose only
 * file is index.tsx, and pointed at an eslint that was never installed.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-electron/**',
      '**/node_modules/**',
      'assets/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Pre-existing pattern in App/ExamPortal/ExamSetup/Settings: reading
      // localStorage in a mount effect and seeding state from it. Correct but
      // flagged by the react-hooks v7 rule. Untangling it means reworking
      // initialization across four components — deliberately out of scope here
      // rather than mixed into a bugfix change.
      'react-hooks/set-state-in-effect': 'off',
      // This codebase intentionally uses `any` at the Gemini REST boundary,
      // where the response shape is not ours to type.
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow deliberately unused args (e.g. `_omitTimeout` destructuring to
      // strip a field) as long as they are underscore-prefixed.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Tests legitimately use empty mock bodies and non-null assertions.
    files: ['**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
