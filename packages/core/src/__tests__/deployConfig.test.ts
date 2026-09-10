import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Deployment-config guards.
 *
 * This repo ships to two targets with different root paths: GitHub Pages serves
 * a project site under /smartexam/, Vercel serves the domain root. One inline
 * env var in vercel.json is the only thing keeping Vercel's asset URLs correct,
 * and a broken base path fails silently — the build succeeds and every asset
 * 404s in the browser. Nothing else tests it.
 *
 * Follows the precedent in constants/__tests__/models.test.ts, which parses
 * api/proxy-gemini.ts to keep the model lists from drifting.
 */

const repoRoot = resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(resolve(repoRoot, rel), 'utf-8');

describe('vercel.json', () => {
  const vercelJson = read('vercel.json');
  const config = JSON.parse(vercelJson);

  it('overrides the base path to the domain root', () => {
    // Without this the Vite default (/smartexam/, for GitHub Pages) ships and
    // every asset 404s on Vercel.
    expect(config.buildCommand).toContain('VITE_BASE_PATH=/');
  });

  it('points outputDirectory at the web build output', () => {
    expect(config.outputDirectory).toBe('packages/web/dist');
  });

  it('does not reference a legacy @secret', () => {
    // "@name" is the deprecated Secrets syntax. A reference to a secret nobody
    // created fails the deployment at config validation, before install runs —
    // and adding a plain Project Settings variable does NOT satisfy it, which
    // is exactly what DEPLOYMENT.md tells users to do.
    const envValues = Object.values(config.env ?? {}) as string[];
    const offenders = envValues.filter(v => typeof v === 'string' && v.startsWith('@'));
    expect(offenders).toEqual([]);
  });

  it('gives the proxy function room for a long extraction', () => {
    // The client budgets 240s for file-backed extraction
    // (FILE_REQUEST_TIMEOUT_MS); a shorter function cap returns 504 first.
    const fn = config.functions?.['api/proxy-gemini.ts'];
    expect(fn?.maxDuration).toBeGreaterThanOrEqual(240);
  });

  it('excludes the Electron workspace from the install', () => {
    // packages/desktop drags electron + electron-builder into a static web
    // build: slow, large, and an extra failure surface for no benefit.
    expect(config.installCommand).toBeTruthy();
    expect(config.installCommand).not.toContain('packages/desktop');
    expect(config.installCommand).toContain('packages/web');
  });
});

describe('packages/web/vite.config.ts', () => {
  const viteConfig = read('packages/web/vite.config.ts');

  it('keeps /smartexam/ as the default base for GitHub Pages', () => {
    expect(viteConfig).toContain("env.VITE_BASE_PATH || '/smartexam/'");
  });
});

describe('.env.example', () => {
  const envExample = read('.env.example');

  it('documents the variables a deploy actually depends on', () => {
    // VITE_BASE_PATH decides whether assets resolve; VITE_USE_GEMINI_PROXY
    // decides whether the server-side key is ever used. Both were undocumented.
    expect(envExample).toContain('VITE_BASE_PATH');
    expect(envExample).toContain('VITE_USE_GEMINI_PROXY');
  });
});
