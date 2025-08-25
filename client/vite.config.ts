import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.gitpod.io'], // allow all Gitpod preview URLs
    host: true,                   // so it binds to 0.0.0.0
    port: 5173
  }
})
