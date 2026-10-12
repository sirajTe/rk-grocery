import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backend = process.env.API_PROXY ?? 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // In dev, the FastAPI backend (backend/) is reached through the Vite server
  server: { proxy: { '/api': backend, '/uploads': backend } },
})
