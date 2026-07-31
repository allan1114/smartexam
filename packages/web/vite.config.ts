import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
    // Only load environment variables with VITE_ prefix for security
    const env = loadEnv(mode, '.', 'VITE_');

    return {
      // GitHub Pages serves this as a project site under /smartexam/, but the
      // same repo also deploys to Vercel at the domain root. Make it overridable
      // (VITE_BASE_PATH=/ for Vercel) instead of hardcoding one target.
      base: env.VITE_BASE_PATH || '/smartexam/',
      server: {
        port: 3000,
        // Only expose to localhost in development
        host: command === 'serve' ? 'localhost' : undefined,
      },
      plugins: [react()],
      // Do not expose API keys via define
      // Use import.meta.env.VITE_GEMINI_API_KEY instead
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
