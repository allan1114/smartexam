export { default as App } from './App';
export * from './types';
// NOTE: there are deliberately no `./utils` / `./services` barrels. The web and
// desktop apps import core source files by relative path, and the previous
// `export * from './utils'` pointed at a utils/index.ts that never existed —
// so importing '@smartexam/core' failed to resolve at all.
