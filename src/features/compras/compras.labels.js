import { Big, toDecimal } from '../../shared/utils/decimal.util';

/**
 * Estados de la orden de compra y las reglas que deciden qué se le puede hacer.
 *
 * Igual que en Ventas, viven aquí y no repartidas por las pantallas: son las
 * mismas que valida el backend (FLUJO-COMPRAS §3–§4), y tenerlas juntas hace
 * que "¿se puede recibir contra esta orden?" tenga una sola respuesta.
 */

/** @typedef {import('../../api/models/compras.model.js').EstadoOrdenCompra} EstadoOrdenCompra */
/** @typedef {import('../../api/models/compras.model.js').OrdenCompra} OrdenCompra */
/** @typedef {import('../../shared/ui/Badge.jsx').BadgeTono} BadgeTono */

export const ESTADO_ORDEN_LABEL = {
  pendiente_aprobacion: 'Pendiente de aprobación',
  enviada: 'Enviada',
  recibida_parcial: 'Recibida parcial',
  recibida_total: 'Recibida total',
  cancelada: 'Cancelada',
};

/**
 * @param {EstadoOrdenCompra} estado
 * @returns {BadgeTono}
 */
export function tonoOrden(estado) {
  switch (estado) {
    case 'recibida_total':
      return 'exito';
    case 'enviada':
      return 'info';
    case 'pendiente_aprobacion':
    case 'recibida_parcial':
      return 'aviso';
    default:
      return 'error';
  }
}

/**
 * La aprobación es manual y solo aplica a la orden que nació por encima del
 * umbral.
 *
 * @param {EstadoOrdenCompra} estado
 */
export function ordenEsAprobable(estado) {
  return estado === 'pendiente_aprobacion';
}

/**
 * Solo se recibe contra una orden ya aprobada y no cerrada.
 *
 * Una `pendiente_aprobacion` **no** admite recepciones: ese es justo el efecto
 * del umbral, retener la mercancía hasta que alguien apruebe el gasto.
 *
 * @param {EstadoOrdenCompra} estado
 */
export function ordenEsRecibible(estado) {
  return estado === 'enviada' || estado === 'recibida_parcial';
}

/**
 * Cancelar cierra la orden a nuevas recepciones; lo recibido no se toca.
 *
 * @param {EstadoOrdenCompra} estado
 */
export function ordenEsCancelable(estado) {
  return estado === 'pendiente_aprobacion' || estado === 'enviada' || estado === 'recibida_parcial';
}

/**
 * Editable mientras no se haya recibido nada y no esté cerrada.
 *
 * No basta con mirar el estado: una orden puede seguir en `enviada` y ya tener
 * una recepción parcial que aún no la movió de estado. Por eso se comprueba
 * también que ninguna línea tenga cantidad recibida — cambiar las líneas
 * después de recibir dejaría el pendiente sin sentido.
 *
 * @param {OrdenCompra} orden
 */
export function ordenEsEditable(orden) {
  const abierta = orden.estado === 'pendiente_aprobacion' || orden.estado === 'enviada';
  return abierta && !tieneRecepciones(orden);
}

/** @param {OrdenCompra} orden */
export function tieneRecepciones(orden) {
  return orden.lineas.some((linea) => toDecimal(linea.cantidad_recibida).gt(0));
}

/**
 * Lo que falta por recibir de una línea. Nunca negativo.
 *
 * @param {{cantidad: string, cantidad_recibida: string}} linea
 * @returns {Big}
 */
export function pendienteDeLinea(linea) {
  const pendiente = toDecimal(linea.cantidad).minus(toDecimal(linea.cantidad_recibida));
  return pendiente.gt(0) ? pendiente : new Big(0);
}

/**
 * Suma de lo pendiente en toda la orden.
 *
 * @param {OrdenCompra} orden
 * @returns {Big}
 */
export function pendienteDeOrden(orden) {
  return orden.lineas.reduce((suma, linea) => suma.plus(pendienteDeLinea(linea)), new Big(0));
}
