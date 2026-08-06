import { realpathSync } from 'node:fs';

/**
 * Aborta si el directorio de trabajo no coincide en mayúsculas/minúsculas con
 * el nombre real en disco.
 *
 * Windows resuelve `C:\nova\novaerp-frontend` y `C:\nova\NovaERP-frontend` al
 * mismo sitio, pero el cargador ESM de Node **no**: cada grafía es una
 * identidad de módulo distinta, así que `@angular/core` se carga dos veces. Las
 * dos copias tienen su propio estado interno de contexto de inyección, y el
 * resultado es que `inject()` falla incluso dentro de constructores
 * perfectamente válidos:
 *
 *   NG0203: The `HttpHandler` token injection failed…
 *   NG0203: inputFunction() can only be used within an injection context…
 *   Cannot configure the test module when the test module has already been
 *   instantiated.
 *
 * Nada de eso apunta al código real, y se pierde mucho tiempo buscando el fallo
 * en los tests. Por eso este aviso: el mensaje sale antes de que arranque
 * vitest y dice exactamente qué hacer.
 *
 * Solo afecta a los tests. `ng build` y `ng serve` resuelven sus módulos por
 * otra vía y funcionan con cualquiera de las dos grafías.
 */

const actual = process.cwd();
const real = realpathSync.native(actual);

if (actual !== real) {
  console.error(
    [
      '',
      '  El directorio de trabajo no coincide con el nombre real en disco.',
      '',
      `    usado: ${actual}`,
      `    real:  ${real}`,
      '',
      '  Node cargaría dos copias de @angular/core y los tests fallarían con',
      '  errores NG0203 que no tienen nada que ver con el código.',
      '',
      `  Ejecuta los tests desde:  ${real}`,
      '',
    ].join('\n'),
  );
  process.exit(1);
}
