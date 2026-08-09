import { defineConfig } from 'vitest/config';

/**
 * Core owns the whole test suite (web/desktop have none). Without this config
 * vitest defaulted to the `node` environment, so every test touching `window`
 * or `document` failed, and `src/__tests__/setup.ts` was never loaded at all.
 *
 * `include` is deliberately scoped to `src/**` so a run started from the repo
 * root can never collect the stale top-level `/src` copies.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
