// compras_utils.js
// Formatos, parseos y catálogos de estado del módulo de Compras.
// Los montos/decimales viajan como string desde la API (numeric de
// Postgres) — se parsean con cuidado para no perder precisión ni mandar
// NaN al backend (ver nota "Costos como string" en FLUJO-COMPRAS.md §6).

export function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function formatDecimal(value, decimals = 3) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

// Convierte lo que haya en un <input type="number"> (string) a un string
// "limpio" apto para mandar como decimal al backend, o null si está vacío.
export function toDecimalString(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return String(n);
}

// ---------------------------------------------------------------- Estados
// orden_estado (Postgres ENUM): borrador, pendiente_aprobacion, enviada,
// recibida_parcial, recibida_total, cancelada. crear_orden_compra() nunca
// deja una orden en 'borrador' (nace pendiente_aprobacion o enviada), pero
// se incluye por si el enum se usa en otro flujo futuro.

export const ORDEN_ESTADOS = {
  borrador: { label: 'Borrador', tone: 'gray' },
  pendiente_aprobacion: { label: 'Pendiente de aprobación', tone: 'amber' },
  enviada: { label: 'Enviada', tone: 'blue' },
  recibida_parcial: { label: 'Recibida parcial', tone: 'amber' },
  recibida_total: { label: 'Recibida total', tone: 'green' },
  cancelada: { label: 'Cancelada', tone: 'red' },
};

export const ESTADOS_EDITABLES = new Set(['pendiente_aprobacion', 'enviada']);
export const ESTADOS_CANCELABLES = new Set(['pendiente_aprobacion', 'enviada', 'recibida_parcial']);
export const ESTADOS_RECIBIBLES = new Set(['enviada', 'recibida_parcial']);

const TONE_CLASSES = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export function badgeClasses(tone) {
  return `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
    TONE_CLASSES[tone] || TONE_CLASSES.gray
  }`;
}

// Cuánto de una línea de orden queda por recibir — solo para UX; la
// autoridad final es el backend (crear_recepcion valida cantidad <=
// pendiente y responde 422 si se excede).
export function cantidadPendiente(linea) {
  const cantidad = Number(linea.cantidad);
  const recibida = Number(linea.cantidad_recibida || 0);
  return Math.max(0, cantidad - recibida);
}