/**
 * Formato de las marcas de tiempo que devuelve la API (ISO 8601 en UTC).
 *
 * Se renderizan en la zona horaria del navegador a propósito: un movimiento de
 * inventario lo captura una persona en un almacén, y la hora que espera ver es
 * la suya, no la del servidor.
 */

const LOCALE = 'es-MX';

/**
 * Fecha + hora. Lo que llevan las bitácoras (kardex, ajustes, alertas).
 *
 * @param {string | null | undefined} iso
 */
export function formatFechaHora(iso) {
  return formatear(iso, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Solo fecha. Para columnas donde la hora no aporta.
 *
 * @param {string | null | undefined} iso
 */
export function formatFecha(iso) {
  return formatear(iso, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * `YYYY-MM-DD`, que es lo que esperan los filtros `desde`/`hasta`.
 *
 * @param {Date} fecha
 */
export function aFechaIso(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Hoy en `YYYY-MM-DD`. Los formularios lo usan como mínimo de fecha. */
export function hoyIso() {
  return aFechaIso(new Date());
}

/**
 * @param {string | null | undefined} iso
 * @param {Intl.DateTimeFormatOptions} options
 */
function formatear(iso, options) {
  if (!iso) return '—';

  const fecha = new Date(iso);
  // Un ISO inválido da `Invalid Date`, cuyo `getTime()` es NaN. Sin este
  // guardia, `Intl` lanzaría en vez de degradar.
  if (Number.isNaN(fecha.getTime())) return iso;

  return new Intl.DateTimeFormat(LOCALE, options).format(fecha);
}
