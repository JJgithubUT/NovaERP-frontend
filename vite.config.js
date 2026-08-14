import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      /*
       * `prompt` y no `autoUpdate`: el Service Worker descarga la versión nueva
       * pero no la aplica solo. Recargar por su cuenta mientras alguien captura
       * una factura le borraría el formulario — lo decide el usuario desde
       * `ActualizacionPrompt`.
       */
      registerType: 'prompt',
      /*
       * `injectManifest` y no `generateSW` porque el SW no solo precachea: lleva
       * el manejador de Background Sync que drena el outbox aunque el usuario
       * haya cerrado la pestaña. Ese código es nuestro, así que el SW es
       * nuestro y Workbox solo le inyecta la lista de assets.
       */
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      manifest: {
        name: 'NovaERP',
        short_name: 'NovaERP',
        description: 'Sistema de gestión empresarial',
        lang: 'es-MX',
        start_url: '/',
        display: 'standalone',
        background_color: '#F2F2F2',
        theme_color: '#73030D',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
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
