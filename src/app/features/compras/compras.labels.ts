import type { EstadoOrdenCompra, OrdenCompra } from '../../api/models';
import type { BadgeTono } from '../../shared/ui/badge/badge.component';
import { Big, toDecimal } from '../../shared/utils/decimal.util';

/**
 * Estados de la orden de compra y las reglas que deciden qué se le puede hacer.
 *
 * Igual que en Ventas, viven aquí y no repartidas por las plantillas: son las
 * mismas que valida el backend (FLUJO-COMPRAS §3–§4), y tenerlas juntas hace
 * que "¿se puede recibir contra esta orden?" tenga una sola respuesta.
 */

export const ESTADO_ORDEN_LABEL: Readonly<Record<EstadoOrdenCompra, string>> = {
  pendiente_aprobacion: 'Pendiente de aprobación',
  enviada: 'Enviada',
  recibida_parcial: 'Recibida parcial',
  recibida_total: 'Recibida total',
  cancelada: 'Cancelada',
};

export function tonoOrden(estado: EstadoOrdenCompra): BadgeTono {
  switch (estado) {
    case 'recibida_total':
      return 'exito';
    case 'enviada':
      return 'info';
    case 'pendiente_aprobacion':
    case 'recibida_parcial':
      return 'aviso';
    case 'cancelada':
      return 'error';
  }
}

/** La aprobación es manual y solo aplica a la orden que nació por encima del umbral. */
export function ordenEsAprobable(estado: EstadoOrdenCompra): boolean {
  return estado === 'pendiente_aprobacion';
}

/**
 * Solo se recibe contra una orden ya aprobada y no cerrada.
 *
 * Una `pendiente_aprobacion` **no** admite recepciones: ese es justo el efecto
 * del umbral, retener la mercancía hasta que alguien apruebe el gasto.
 */
export function ordenEsRecibible(estado: EstadoOrdenCompra): boolean {
  return estado === 'enviada' || estado === 'recibida_parcial';
}

/** Cancelar cierra la orden a nuevas recepciones; lo recibido no se toca. */
export function ordenEsCancelable(estado: EstadoOrdenCompra): boolean {
  return estado === 'pendiente_aprobacion' || estado === 'enviada' || estado === 'recibida_parcial';
}

/**
 * Editable mientras no se haya recibido nada y no esté cerrada.
 *
 * No basta con mirar el estado: una orden puede seguir en `enviada` y ya tener
 * una recepción parcial que aún no la movió de estado. Por eso se comprueba
 * también que ninguna línea tenga cantidad recibida — cambiar las líneas
 * después de recibir dejaría el pendiente sin sentido.
 */
export function ordenEsEditable(orden: OrdenCompra): boolean {
  const abierta = orden.estado === 'pendiente_aprobacion' || orden.estado === 'enviada';
  return abierta && !tieneRecepciones(orden);
}

export function tieneRecepciones(orden: OrdenCompra): boolean {
  return orden.lineas.some((linea) => toDecimal(linea.cantidad_recibida).gt(0));
}

/** Lo que falta por recibir de una línea. Nunca negativo. */
export function pendienteDeLinea(linea: { cantidad: string; cantidad_recibida: string }): Big {
  const pendiente = toDecimal(linea.cantidad).minus(toDecimal(linea.cantidad_recibida));
  return pendiente.gt(0) ? pendiente : new Big(0);
}

/** Suma de lo pendiente en toda la orden. */
export function pendienteDeOrden(orden: OrdenCompra): Big {
  return orden.lineas.reduce((suma, linea) => suma.plus(pendienteDeLinea(linea)), new Big(0));
}
