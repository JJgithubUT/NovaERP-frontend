import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // El despliegue será en una computadora expuesta a la red, así que el dev
    // server también escucha en todas las interfaces y no solo en localhost.
    host: true,
    proxy: {
      // Cada vez que React pida algo que empiece con /api, Vite lo redirigirá a Django
      '/api': {
        target: 'http://127.0.0.1:8000', // Reemplaza por el puerto donde corres tu backend Django si es diferente
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
