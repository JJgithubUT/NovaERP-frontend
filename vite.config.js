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
      /*
       * El registro lo hace `core/pwa/pwa-registro.js` desde `main.jsx`, no el
       * plugin: así el SW se instala también en las pantallas públicas (login),
       * no solo cuando se monta el shell.
       */
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        /*
         * El tope por defecto es 2 MiB. Un chunk que lo pase se queda fuera del
         * precache sin error —solo un aviso en el build— y la app deja de abrir
         * offline. En un ERP con ~30 pantallas no es raro llegar ahí.
         */
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'NovaERP',
        short_name: 'NovaERP',
        description: 'Sistema de gestión empresarial',
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F2F2F2',
        theme_color: '#73030D',
        /*
         * El SVG solo no basta: Android pide PNG de 192 y 512 para ofrecer
         * «Instalar» con buen ícono, y el `maskable` evita que lo recorte en un
         * círculo con bordes blancos. Los genera `npm run iconos`.
         */
        icons: [
          { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
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