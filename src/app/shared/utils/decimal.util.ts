import Big from 'big.js';
import type { DecimalString } from '../../api/models';

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

export function toDecimal(value: DecimalString | number | Big): Big {
  return value instanceof Big ? value : new Big(value);
}

/** Convierte a string seguro para mandar al backend. `null` si no es válido. */
export function parseDecimal(value: string): DecimalString | null {
  const limpio = value.trim();
  if (limpio === '') return null;

  try {
    return new Big(limpio).toString();
  } catch {
    return null;
  }
}

export function isValidDecimal(value: string): boolean {
  return parseDecimal(value) !== null;
}

export function isNegative(value: DecimalString): boolean {
  try {
    return new Big(value).lt(0);
  } catch {
    return false;
  }
}

/** Varias reglas del backend son "debe ser >= 0". Esta es su contraparte local. */
export function isNonNegative(value: string): boolean {
  const parsed = parseDecimal(value);
  return parsed !== null && !isNegative(parsed);
}

/**
 * Formatea para mostrar. Usa el separador de miles/decimales del locale, así
 * que el resultado **es solo para pintar en pantalla** — nunca lo mandes de
 * vuelta a la API.
 */
export function formatDecimal(
  value: DecimalString,
  options: Intl.NumberFormatOptions = {},
  locale = 'es-MX',
): string {
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
    return value;
  }
}

export function formatMoneda(value: DecimalString, currency = 'MXN', locale = 'es-MX'): string {
  return formatDecimal(value, { style: 'currency', currency }, locale);
}

/**
 * Cantidades de inventario: sin decimales forzados, porque "5" es más legible
 * que "5.00" para un stock mínimo.
 */
export function formatCantidad(value: DecimalString, locale = 'es-MX'): string {
  return formatDecimal(value, { minimumFractionDigits: 0, maximumFractionDigits: 4 }, locale);
}

export { Big };
