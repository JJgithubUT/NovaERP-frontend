import { crearRecurso } from '../rest';
/** Rutas de los seis reportes. La exportación reusa la misma que la consulta. */
export const RUTAS_REPORTE = {
  ventasPeriodo: '/reportes/ventas-por-periodo/',
  clientes: '/reportes/clientes/',
  productos: '/reportes/productos/',
  embudo: '/reportes/embudo/',
  cartera: '/reportes/cartera/',
  vendedores: '/reportes/vendedores/',
};
/**
 * Reportes de Ventas (RV-01..06).
 *
 * Consultar y exportar son el mismo endpoint: sin `formato` responde JSON, con
 * `formato=csv|pdf` devuelve el archivo del reporte **completo** (ignorando
 * `limit`) y exige el permiso `ventas:reportes:exportar`. Por eso la
 * exportación va por una función aparte: necesita `responseType: 'blob'`, y un
 * blob y un objeto tipado no caben en la misma firma.
 */
const r = crearRecurso('/api/ventas');
export function ventasPorPeriodo(query) {
  return r.get(RUTAS_REPORTE.ventasPeriodo, query);
}
export function rankingClientes(query) {
  return r.get(RUTAS_REPORTE.clientes, query);
}
export function rankingProductos(query) {
  return r.get(RUTAS_REPORTE.productos, query);
}
export function embudo(query) {
  return r.get(RUTAS_REPORTE.embudo, query);
}
export function cartera(query) {
  return r.get(RUTAS_REPORTE.cartera, query);
}
export function vendedores(query) {
  return r.get(RUTAS_REPORTE.vendedores, query);
}
/** Devuelve el archivo. Un 403 aquí significa que falta `:exportar`. */
export function exportar(ruta, query, formato) {
  return r.blob(ruta, { ...query, formato });
}
/**
 * Lanza la descarga de un blob ya recibido.
 *
 * El `revokeObjectURL` no es opcional: cada `createObjectURL` retiene el blob
 * entero en memoria hasta que se libera, y en una sesión larga exportando
 * reportes eso se acumula.
 */
export function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
