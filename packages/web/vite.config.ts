import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
    // Only load environment variables with VITE_ prefix for security
    const env = loadEnv(mode, '.', 'VITE_');

    return {
      base: '/smartexam/',
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
