// @ts-check
import { build } from 'esbuild';
import { injectManifest } from 'workbox-build';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Compila el Service Worker. Corre **después** de `ng build`, nunca antes:
 * el precache manifest se calcula sobre los archivos ya emitidos y hasheados.
 *
 * Son dos pasos y el orden importa:
 *
 * 1. esbuild empaqueta `src/sw/sw.ts` (con Workbox y Dexie dentro) a un único
 *    `sw.js`. Angular no puede hacerlo: su builder compila la app, no workers
 *    sueltos con su propio punto de entrada.
 * 2. workbox-build escanea `dist/` y sustituye el marcador `self.__WB_MANIFEST`
 *    por la lista real de assets con sus revisiones.
 *
 * Invertir el orden dejaría un SW que precachea una lista vacía: instalaría bien
 * y fallaría en frío, que es el peor modo de fallar.
 */

const DIST = resolve(process.cwd(), 'dist/nova-erp/browser');
const SW_OUT = resolve(DIST, 'sw.js');

if (!existsSync(DIST)) {
  console.error(`[build-sw] No existe ${DIST}. Corre \`ng build\` primero.`);
  process.exit(1);
}

console.log('[build-sw] Empaquetando src/sw/sw.ts…');

await build({
  entryPoints: ['src/sw/sw.ts'],
  outfile: SW_OUT,
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  target: 'es2022',
  // El SW no corre en una ventana: no hay `document` ni `window`.
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
});

console.log('[build-sw] Inyectando precache manifest…');

const { count, size, warnings } = await injectManifest({
  swSrc: SW_OUT,
  swDest: SW_OUT,
  globDirectory: DIST,
  globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
  // El SW no se precachea a sí mismo, y los .map son peso muerto en el móvil.
  globIgnores: ['sw.js', '**/*.map'],
  // Los archivos de Angular ya llevan hash de contenido en el nombre, así que
  // el nombre *es* la revisión. Ojo con el rango: los hashes son alfanuméricos
  // mixtos (`main-SGE5DBBX.js`, `chunk-yysMHlkZ.js`), y un patrón que solo
  // acepte mayúsculas deja fuera a la mitad de los chunks.
  dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8,}\.(js|css)$/,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

for (const warning of warnings) console.warn(`[build-sw] ${warning}`);

console.log(`[build-sw] Listo: ${count} archivos precacheados (${(size / 1024).toFixed(0)} kB).`);
