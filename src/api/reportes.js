import api from './axios';

/**
 * Capa de API — Reportes de Ventas (RV-01..06)
 * Rutas reales en el backend: /api/ventas/reportes/*. Ver FLUJO-VENTAS-REPORTES.md.
 *
 * IMPORTANTE: axios ya tiene baseURL = VITE_API_URL, que incluye "/api"
 * (mismo patrón que compras/api.js). Por eso aquí NUNCA se vuelve a escribir
 * "/api/..." en las rutas — si lo haces, terminas pegándole a /api/api/...
 *
 * Convenciones comunes a los 6:
 * - `desde`/`hasta` son obligatorios (excepto Cartera, que usa `corte`).
 * - `?formato=csv|pdf` descarga el archivo completo (requiere permiso :exportar);
 *   por eso las funciones de exportación son distintas de las de consulta JSON
 *   (responseType: 'blob').
 * - Los montos vienen como string decimal — no los conviertas con parseFloat en
 *   este archivo; eso es responsabilidad del componente que los muestra/parsea.
 */

// ── RV-01 · Ventas por periodo ─────────────────────────────────────────────
// params: { desde, hasta, agrupar, cliente_id, vendedor_id }
export function fetchVentasPorPeriodo(params) {
  return api.get('/ventas/reportes/ventas-por-periodo/', { params });
}

// ── RV-02 · Ranking de clientes ────────────────────────────────────────────
// params: { desde, hasta, orden, limit, vendedor_id }
export function fetchRankingClientes(params) {
  return api.get('/ventas/reportes/clientes/', { params });
}

// ── RV-03 · Ranking de productos ───────────────────────────────────────────
// params: { desde, hasta, orden, limit, cliente_id, vendedor_id }
export function fetchRankingProductos(params) {
  return api.get('/ventas/reportes/productos/', { params });
}

// ── RV-04 · Embudo comercial ────────────────────────────────────────────────
// params: { desde, hasta, vendedor_id }
export function fetchEmbudo(params) {
  return api.get('/ventas/reportes/embudo/', { params });
}

// ── RV-05 · Cartera por antigüedad (usa `corte`, no rango) ─────────────────
// params: { corte, cliente_id, detalle, page, page_size }
export function fetchCartera(params) {
  return api.get('/ventas/reportes/cartera/', { params });
}

// ── RV-06 · Desempeño de vendedores ─────────────────────────────────────────
// params: { desde, hasta, vendedor_id }
export function fetchVendedores(params) {
  return api.get('/ventas/reportes/vendedores/', { params });
}

/**
 * Exportación (CSV/PDF) — misma ruta que la consulta, con ?formato=.
 * Requiere ventas:reportes:exportar (403 si falta); el botón que llama a esto
 * debe estar oculto si el usuario no tiene ese permiso.
 *
 * @param {string} path - ruta relativa, ej. '/ventas/reportes/clientes/'
 * @param {object} params - mismos filtros que la consulta JSON, más formato
 * @param {'csv'|'pdf'} formato
 */
export function exportarReporte(path, params, formato) {
  return api.get(path, {
    params: { ...params, formato },
    responseType: 'blob',
  });
}

// Mapa de rutas, útil para que exportarReporte() no dependa de strings sueltos
// repetidos en cada componente de reporte.
export const RUTAS_REPORTES = {
  ventasPorPeriodo: '/ventas/reportes/ventas-por-periodo/',
  clientes: '/ventas/reportes/clientes/',
  productos: '/ventas/reportes/productos/',
  embudo: '/ventas/reportes/embudo/',
  cartera: '/ventas/reportes/cartera/',
  vendedores: '/ventas/reportes/vendedores/',
};

/**
 * Dispara la descarga de un blob ya recibido de exportarReporte().
 * Uso típico en el componente:
 *   const res = await exportarReporte(RUTAS_REPORTES.clientes, params, 'csv');
 *   descargarBlob(res.data, `clientes-${desde}-${hasta}.csv`);
 */
export function descargarBlob(blobData, nombreArchivo) {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}