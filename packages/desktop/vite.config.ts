import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    server: {
      port: 5173,
      host: command === 'serve' ? 'localhost' : undefined,
    },
    plugins: [
      react(),
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              lib: {
                entry: 'electron/main.ts',
                formats: ['cjs'],
              },
              rollupOptions: {
                output: {
                  entryFileNames: '[name].js',
                },
              },
            },
          },
        },
      ]),
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
