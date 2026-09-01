import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev / standalone build. The library build lives in vite.lib.config.js.
// src/App.jsx is the only file allowed to read import.meta.env / URL params: the
// library build must stay free of Vite env references (enforced in CI).
export default defineConfig({
  plugins: [react()],
  base: '/qmrf/',
  server: {
    port: 5176
  }
})
