import { vi, afterEach } from 'vitest';
// The /vitest entry wires the matchers into vitest's `expect`. The bare
// '@testing-library/jest-dom' import assumes a global `expect` (Jest) and
// throws "expect is not defined" under vitest without `globals: true`.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Testing Library only auto-registers its cleanup when vitest runs with
// `globals: true`. We keep explicit imports everywhere, so unmount between
// tests here — otherwise every rendered tree stays in document.body and
// queries fail with "Found multiple elements with the role ...".
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom has no matchMedia; App reads it during theme initialization.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// NOTE: localStorage is deliberately NOT mocked. jsdom supplies a real,
// spec-compliant Storage, which is what lets tests spy on
// `Storage.prototype.setItem` to simulate quota failures. Replacing it with a
// plain object silently broke those spies.

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};
