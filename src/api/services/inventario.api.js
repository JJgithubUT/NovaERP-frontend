import { crearRecurso } from '../rest';
/** Cliente HTTP del módulo de Inventario. */
const r = crearRecurso('/api/inventario');
/* -------------------------------------------------------------- productos */
export function listarProductos(query = {}) {
  return r.get('/productos/', query);
}
export function crearProducto(body) {
  return r.post('/productos/', body);
}
export function editarProducto(id, body) {
  return r.patch(`/productos/${id}/`, body);
}
/** Baja lógica: el producto queda `activo: false`, el kardex se conserva. */
export function darDeBajaProducto(id) {
  return r.del(`/productos/${id}/`);
}
/* -------------------------------------------------------------- almacenes */
export function listarAlmacenes(query = {}) {
  return r.get('/almacenes/', query);
}
export function crearAlmacen(body) {
  return r.post('/almacenes/', body);
}
export function editarAlmacen(id, body) {
  return r.patch(`/almacenes/${id}/`, body);
}
export function darDeBajaAlmacen(id) {
  return r.del(`/almacenes/${id}/`);
}
/* ------------------------------------------------------------ movimientos */
/**
 * Entrada o salida manual. Una salida que dejaría el stock negativo se rechaza
 * con 422 y el mensaje llega como `ApiError.message`.
 */
export function crearMovimiento(body) {
  return r.post('/movimientos/', body);
}
export function listarMovimientos(query = {}) {
  return r.get('/movimientos/', query);
}
/* ----------------------------------------------------------------- ajustes */
export function listarAjustes(query = {}) {
  return r.get('/ajustes/', query);
}
export function crearAjuste(body) {
  return r.post('/ajustes/', body);
}
/* ---------------------------------------------------------- transferencias */
export function listarTransferencias(query = {}) {
  return r.get('/transferencias/', query);
}
/** Salida + entrada atómicas: o se aplican las dos o ninguna. */
export function crearTransferencia(body) {
  return r.post('/transferencias/', body);
}
/* ---------------------------------------------------------------- consultas */
export function listarStock(query = {}) {
  return r.get('/stock-disponible/', query);
}
export function listarKardex(query = {}) {
  return r.get('/kardex/', query);
}
export function listarValuacion(query = {}) {
  return r.get('/valuacion/', query);
}
/* ------------------------------------------------------------------ alertas */
export function listarAlertas(query = {}) {
  return r.get('/alertas-stock-minimo/', query);
}
/** El id es entero, no UUID: esta tabla usa secuencial. */
export function notificarAlerta(id) {
  return r.post(`/alertas-stock-minimo/${id}/notificar/`);
}
