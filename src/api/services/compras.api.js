import { crearRecurso } from '../rest';
/**
 * Cliente HTTP del módulo de Compras.
 *
 * Una asimetría del contrato que conviene tener presente: aprobar una orden no
 * tiene endpoint propio, es un `PATCH` con `estado: 'enviada'`. Cancelar sí lo
 * tiene. No es un descuido del diseño — la aprobación es manual y no dispara
 * efectos, mientras que cancelar cierra la orden a nuevas recepciones.
 */
const r = crearRecurso('/api/compras');
/* ------------------------------------------------------------ proveedores */
export function listarProveedores(query = {}) {
  return r.get('/proveedores/', query);
}
export function crearProveedor(body) {
  return r.post('/proveedores/', body);
}
export function editarProveedor(id, body) {
  return r.patch(`/proveedores/${id}/`, body);
}
/**
 * Baja lógica **incondicional**, a diferencia del cliente: aquí no se comprueba
 * deuda pendiente. Las órdenes y cuentas por pagar del proveedor se conservan
 * intactas.
 */
export function darDeBajaProveedor(id) {
  return r.del(`/proveedores/${id}/`);
}
/** RF-51. Ficha completa, sin paginar: órdenes, recepciones y CxP juntas. */
export function historialProveedor(id) {
  return r.get(`/proveedores/${id}/historial/`);
}
/* ----------------------------------------------------------------- órdenes */
export function listarOrdenes(query = {}) {
  return r.get('/ordenes/', query);
}
export function obtenerOrden(id) {
  return r.get(`/ordenes/${id}/`);
}
/** Si el total supera el umbral del tenant, nace en `pendiente_aprobacion`. */
export function crearOrden(body) {
  return r.post('/ordenes/', body);
}
export function editarOrden(id, body) {
  return r.patch(`/ordenes/${id}/`, body);
}
/** Aprobación manual: el mismo PATCH, moviendo el estado a `enviada`. */
export function aprobarOrden(id) {
  return editarOrden(id, { estado: 'enviada' });
}
/** Cierra la orden a nuevas recepciones. Lo ya recibido queda intacto. */
export function cancelarOrden(id) {
  return r.post(`/ordenes/${id}/cancelar/`);
}
/* ------------------------------------------------------------- recepciones */
export function listarRecepciones(query = {}) {
  return r.get('/recepciones/', query);
}
/**
 * El paso que mueve todo: suma stock y crea la cuenta por pagar. Su efecto
 * sobre el inventario es irreversible.
 */
export function crearRecepcion(body) {
  return r.post('/recepciones/', body);
}
/* -------------------------------------------------------- cuentas por pagar */
export function listarCuentasPorPagar(query = {}) {
  return r.get('/cuentas-por-pagar/', query);
}
/* ---------------------------------------------------------------- config */
export function obtenerConfigAprobacion() {
  return r.get('/config-aprobacion/');
}
export function editarConfigAprobacion(body) {
  return r.patch('/config-aprobacion/', body);
}
