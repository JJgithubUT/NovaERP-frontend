import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Valida el contraste de los tokens de color contra WCAG 2.1 AA.
 *
 * Lee `src/styles.css` en vez de repetir los hexes aquí: un test con su propia
 * copia de la paleta pasaría feliz mientras la app real está rota. Si alguien
 * ajusta un token y hunde el contraste, esto falla antes que el usuario.
 *
 * Es un ERP donde la gente pasa la jornada entera: el contraste no es una
 * casilla de cumplimiento, es si al final del día se puede seguir leyendo.
 */

const CSS = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

/** AA exige 4.5:1 para texto normal. */
const AA_TEXTO = 4.5;

/**
 * Un borde no necesita AA, pero sí distinguirse de la superficie que separa.
 * 1.2:1 es el mínimo para que un divisor no desaparezca del todo.
 */
const BORDE_MINIMO = 1.2;

describe('contraste de los tokens', () => {
  const claro = leerTokens('@theme');
  const oscuro = leerTokens('.dark');

  it('extrae ambas paletas de styles.css, y son distintas entre sí', () => {
    // Si el parser fallara y devolviera el mismo bloque dos veces, los tests
    // del tema oscuro estarían revalidando el claro y pasarían en falso. Este
    // es el que vigila al resto.
    expect(Object.keys(claro).length).toBeGreaterThan(20);
    expect(Object.keys(oscuro).length).toBeGreaterThan(20);
    expect(oscuro['surface']).not.toBe(claro['surface']);
    expect(oscuro['primary-container']).not.toBe(claro['primary-container']);
  });

  describe.each([
    ['claro', () => claro],
    ['oscuro', () => oscuro],
  ])('tema %s', (_nombre, obtener) => {
    /** Pares que la UI realmente pinta juntos. */
    const paresTexto: ReadonlyArray<readonly [string, string]> = [
      ['on-surface', 'surface'],
      ['on-surface', 'surface-container-lowest'],
      ['on-surface-variant', 'surface'],
      ['on-surface-variant', 'surface-container-lowest'],
      // El CTA Guinda. Es su propio par a propósito: ver la nota de `action`
      // en styles.css.
      ['on-action', 'action'],
      // El par real de Material 3, por si alguien usa `bg-primary`.
      ['on-primary', 'primary'],
      ['on-primary-container', 'primary-container'],
      ['primary', 'surface'],
      ['on-error-container', 'error-container'],
      ['on-warning-container', 'warning-container'],
      ['on-success-container', 'success-container'],
      ['inverse-on-surface', 'inverse-surface'],
    ];

    it.each(paresTexto)('%s sobre %s cumple AA para texto', (fg, bg) => {
      const tokens = obtener();
      const ratio = contraste(tokens[fg]!, tokens[bg]!);
      expect(ratio).toBeGreaterThanOrEqual(AA_TEXTO);
    });

    it('outline-variant separa superficies de forma perceptible', () => {
      const tokens = obtener();
      expect(contraste(tokens['outline-variant']!, tokens['surface']!)).toBeGreaterThanOrEqual(
        BORDE_MINIMO,
      );
    });
  });
});

/**
 * Extrae los `--color-*` de un bloque.
 *
 * Busca `selector {` con la llave, no el selector suelto: un `indexOf` a secas
 * engancha la primera mención en un comentario o, en el caso de `.dark`, la de
 * la línea de `@custom-variant` — y acaba parseando el bloque equivocado en
 * silencio. Los dos bloques que nos importan son planos, así que desde la llave
 * de apertura hasta la primera de cierre es todo el cuerpo.
 */
function leerTokens(selector: string): Record<string, string> {
  const patron = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{`);
  const encontrado = patron.exec(CSS);
  if (!encontrado) throw new Error(`No se encontró el bloque ${selector} en styles.css`);

  const inicio = encontrado.index + encontrado[0].length;
  const cuerpo = CSS.slice(inicio, CSS.indexOf('}', inicio));
  const tokens: Record<string, string> = {};

  for (const [, nombre, valor] of cuerpo.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[nombre!] = valor!;
  }
  return tokens;
}

/** Luminancia relativa según WCAG 2.1. */
function luminancia(hex: string): number {
  const canales = hex
    .replace('#', '')
    .match(/../g)!
    .map((par) => {
      const v = parseInt(par, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

  return 0.2126 * canales[0]! + 0.7152 * canales[1]! + 0.0722 * canales[2]!;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (oscuro! + 0.05);
}
