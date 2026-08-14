import Big from 'big.js';

/** @typedef {import('../../api/models/common.model.js').DecimalString} DecimalString */

/**
 * Aritmética y formato de los campos decimales de la API.
 *
 * El backend manda `costo_referencia`, `precio_venta`, `stock_minimo` y
 * `limite_credito` como **string**, no como número JSON, a propósito: un
 * `13500.10` que pasa por un `double` deja de ser `13500.10`. La regla es
 * simple y no tiene excepciones: **nunca uses `parseFloat`/`Number` sobre estos
 * campos**. Entran como string, se operan con Big y salen como string.
 */

// Nunca uses notación exponencial al serializar: el backend espera "0.0000001",
// no "1e-7", y Django lo rechazaría.
Big.NE = -21;
Big.PE = 40;

/**
 * @param {DecimalString | number | Big} value
 * @returns {Big}
 */
export function toDecimal(value) {
  return value instanceof Big ? value : new Big(value);
}

/**
 * Convierte a string seguro para mandar al backend. `null` si no es válido.
 *
 * Es la puerta de validación de todos los formularios, así que un campo que
 * llega vacío del backend (`null`) es una respuesta esperada, no un error: se
 * trata como "no válido" en vez de reventar.
 *
 * @param {string | null | undefined} value
 * @returns {DecimalString | null}
 */
export function parseDecimal(value) {
  if (typeof value !== 'string') return null;
  const limpio = value.trim();
  if (limpio === '') return null;

  try {
    return new Big(limpio).toString();
  } catch {
    return null;
  }
}

/** @param {string | null | undefined} value */
export function isValidDecimal(value) {
  return parseDecimal(value) !== null;
}

/** @param {DecimalString} value */
export function isNegative(value) {
  try {
    return new Big(value).lt(0);
  } catch {
    return false;
  }
}

/**
 * Varias reglas del backend son "debe ser >= 0". Esta es su contraparte local.
 *
 * @param {string | null | undefined} value
 */
export function isNonNegative(value) {
  const parsed = parseDecimal(value);
  return parsed !== null && !isNegative(parsed);
}

/**
 * Formatea para mostrar. Usa el separador de miles/decimales del locale, así
 * que el resultado **es solo para pintar en pantalla** — nunca lo mandes de
 * vuelta a la API.
 *
 * @param {DecimalString} value
 * @param {Intl.NumberFormatOptions} [options]
 * @param {string} [locale]
 */
export function formatDecimal(value, options = {}, locale = 'es-MX') {
  try {
    // Big garantiza que la cadena es un decimal válido antes de que el double
    // de Intl la toque. La pérdida de precisión aquí es aceptable: es texto.
    const normalizado = new Big(value);
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(Number(normalizado.toString()));
  } catch {
    return String(value);
  }
}

/**
 * @param {DecimalString} value
 * @param {string} [currency]
 * @param {string} [locale]
 */
export function formatMoneda(value, currency = 'MXN', locale = 'es-MX') {
  return formatDecimal(value, { style: 'currency', currency }, locale);
}

/**
 * Cantidades de inventario: sin decimales forzados, porque "5" es más legible
 * que "5.00" para un stock mínimo.
 *
 * @param {DecimalString} value
 * @param {string} [locale]
 */
export function formatCantidad(value, locale = 'es-MX') {
  return formatDecimal(value, { minimumFractionDigits: 0, maximumFractionDigits: 4 }, locale);
}

export { Big };
