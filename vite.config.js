
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/babapoly/', // ← ESTE NOMBRE DEBE COINCIDIR CON EL NOMBRE DEL REPO
})
