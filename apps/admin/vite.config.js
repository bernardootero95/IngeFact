import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Sin tests propios por ahora -- la unica logica que se probaba aqui
  // (calculo de DV de NIT) se extrajo a packages/utils (ver dian.test.js).
  test: { passWithNoTests: true },
})
