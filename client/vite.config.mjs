import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.gitpod.io'],
    host: true,
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' }
  },
  build: { outDir: 'dist', emptyOutDir: true }
});
