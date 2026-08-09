import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base './' so assets load correctly on Cloudflare Tunnels, GitHub Pages, and Docker
  base: './',
})
