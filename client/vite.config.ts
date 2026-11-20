import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api/* to the Express server. The browser only ever talks to localhost:5173,
    // so the login cookie is a normal same-site cookie (no cross-origin cookie problems).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
