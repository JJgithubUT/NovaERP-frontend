// inventario/inventario.utils.js
// inventario.movimiento_tipo (ENUM en DB): entrada, salida, ajuste_positivo,
// ajuste_negativo, transferencia_salida, transferencia_entrada.

export const TIPO_LABELS = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste_positivo: 'Ajuste (+)',
  ajuste_negativo: 'Ajuste (−)',
  transferencia_entrada: 'Transferencia · entrada',
  transferencia_salida: 'Transferencia · salida',
};

export const MOTIVO_LABELS = {
  merma: 'Merma',
  conteo_fisico: 'Conteo físico',
  otro: 'Otro',
};

// Usado por TabMovimientos.jsx (kardex) para colorear la columna "tipo".
export function obtenerColorTipoMovimiento(tipo) {
  switch (tipo) {
    case 'entrada':
    case 'ajuste_positivo':
    case 'transferencia_entrada':
      return 'text-emerald-700 bg-emerald-50';
    case 'salida':
    case 'ajuste_negativo':
    case 'transferencia_salida':
      return 'text-red-700 bg-red-50';
    default:
      return 'text-slate-600 bg-slate-100';
  }
}

export function formatMoney(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return Number.isNaN(n) ? v : n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCantidad(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return Number.isNaN(n) ? v : n.toLocaleString('es-MX', { maximumFractionDigits: 3 });
}

export function formatFecha(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch (e) {
    return v;
  }
}