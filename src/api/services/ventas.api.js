import { crearRecurso } from '../rest';
/**
 * Cliente HTTP del módulo de Ventas.
 *
 * Las transiciones de estado (confirmar, resolver, cerrar) son endpoints `POST`
 * con sufijo propio, no `PATCH` sobre el campo `estado` — el backend no deja
 * mover un pedido a `confirmado` escribiéndolo directamente, porque cada
 * transición dispara efectos (reservar stock, validar crédito, crear la CxC).
 */
const r = crearRecurso('/api/ventas');
/* --------------------------------------------------------------- clientes */
export function listarClientes(query = {}) {
  return r.get('/clientes/', query);
}
export function crearCliente(body) {
  return r.post('/clientes/', body);
}
export function editarCliente(id, body) {
  return r.patch(`/clientes/${id}/`, body);
}
/** Se bloquea con 422 si el cliente tiene saldo pendiente en CxC. */
export function darDeBajaCliente(id) {
  return r.del(`/clientes/${id}/`);
}
/* ---------------------------------------------------------- oportunidades */
export function listarOportunidades(query = {}) {
  return r.get('/oportunidades/', query);
}
/** Agregado por etapa para el kanban. No devuelve las oportunidades. */
export function obtenerPipeline() {
  return r.get('/oportunidades/pipeline/');
}
export function crearOportunidad(body) {
  return r.post('/oportunidades/', body);
}
export function editarOportunidad(id, body) {
  return r.patch(`/oportunidades/${id}/`, body);
}
/** Solo a la etapa siguiente; saltar o retroceder da 422. */
export function avanzarEtapa(id, etapa) {
  return r.post(`/oportunidades/${id}/etapa/`, { etapa });
}
/** Terminal: una vez cerrada no se reabre. */
export function cerrarOportunidad(id, body) {
  return r.post(`/oportunidades/${id}/cerrar/`, body);
}
/* ----------------------------------------------------------- cotizaciones */
export function listarCotizaciones(query = {}) {
  return r.get('/cotizaciones/', query);
}
export function obtenerCotizacion(id) {
  return r.get(`/cotizaciones/${id}/`);
}
/** Un `precio_unitario` manual exige `ventas:cotizaciones:ajustar_precio` (403). */
export function crearCotizacion(body) {
  return r.post('/cotizaciones/', body);
}
export function editarCotizacion(id, body) {
  return r.patch(`/cotizaciones/${id}/`, body);
}
/** Aprobar una vencida da 422. */
export function resolverCotizacion(id, body) {
  return r.post(`/cotizaciones/${id}/resolver/`, body);
}
/* ------------------------------------------------------------------ pedidos */
export function listarPedidos(query = {}) {
  return r.get('/pedidos/', query);
}
export function obtenerPedido(id) {
  return r.get(`/pedidos/${id}/`);
}
export function crearPedido(body) {
  return r.post('/pedidos/', body);
}
export function editarPedido(id, body) {
  return r.patch(`/pedidos/${id}/`, body);
}
/**
 * El paso que de verdad compromete inventario y crédito: reserva stock y
 * valida el límite del cliente. Puede acabar en `confirmado` o, con backorder
 * habilitado, en `pendiente_surtido`.
 */
export function confirmarPedido(id, body) {
  return r.post(`/pedidos/${id}/confirmar/`, body);
}
/** Libera el stock reservado. Con facturas emitidas da 422. */
export function cancelarPedido(id) {
  return r.post(`/pedidos/${id}/cancelar/`);
}
/* ----------------------------------------------------------------- facturas */
export function listarFacturas(query = {}) {
  return r.get('/facturas/', query);
}
export function obtenerFactura(id) {
  return r.get(`/facturas/${id}/`);
}
/** Convierte la reserva en salida definitiva y crea la cuenta por cobrar. */
export function crearFactura(body) {
  return r.post('/facturas/', body);
}
/** Única corrección posible: una factura emitida no se edita ni se borra. */
export function emitirNotaCredito(id, body) {
  return r.post(`/facturas/${id}/nota-credito/`, body);
}
