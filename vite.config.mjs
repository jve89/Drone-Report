import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const r = (...p) => resolve(__dirname, ...p);

export default defineConfig({
  root: r('client'),
  plugins: [react()],
  envDir: r('.'),
  server: {
    allowedHosts: ['.gitpod.io'],
    host: true,
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' }
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
