import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use '/wormhole-stream/' for GitHub Pages, '/' for other hosting
  base: process.env.DEPLOY_TARGET === 'ghpages' ? '/wormhole-stream/' : '/',
})
