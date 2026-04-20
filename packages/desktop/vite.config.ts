import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronMain from 'vite-plugin-electron/simple';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    server: {
      port: 5173,
      host: command === 'serve' ? 'localhost' : undefined,
    },
    plugins: [
      react(),
      electronMain({
        entry: 'electron/main.ts',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    },
    build: {
      rollupOptions: {
        external: ['electron']
      }
    }
  };
});
