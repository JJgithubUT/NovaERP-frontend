/**
 * Rótulos y colores de los estados de Ventas, más las reglas de transición que
 * la UI necesita para decidir qué botones ofrecer.
 *
 * Las reglas viven aquí y no repartidas por las pantallas porque son las mismas
 * que valida el backend (FLUJO-VENTAS §2–§5). Tenerlas en un sitio hace que
 * "¿se puede cancelar este pedido?" tenga una única respuesta.
 */

/** @typedef {import('../../api/models/ventas.model.js').EtapaOportunidad} EtapaOportunidad */
/** @typedef {import('../../api/models/ventas.model.js').EstadoOportunidad} EstadoOportunidad */
/** @typedef {import('../../api/models/ventas.model.js').EstadoCotizacion} EstadoCotizacion */
/** @typedef {import('../../api/models/ventas.model.js').EstadoPedido} EstadoPedido */
/** @typedef {import('../../api/models/ventas.model.js').EstadoFactura} EstadoFactura */
/** @typedef {import('../../shared/ui/Badge.jsx').BadgeTono} BadgeTono */

/* ---------------------------------------------------------- oportunidades */

/** El orden **es** la regla: solo se avanza al siguiente elemento. */
export const ETAPAS = ['prospeccion', 'calificacion', 'propuesta', 'negociacion', 'cierre'];

export const ETAPA_LABEL = {
  prospeccion: 'Prospección',
  calificacion: 'Calificación',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  cierre: 'Cierre',
};

export const ESTADO_OPORTUNIDAD_LABEL = {
  abierta: 'Abierta',
  ganada: 'Ganada',
  perdida: 'Perdida',
};

export const MOTIVOS_PERDIDA = [
  'Precio',
  'Competencia',
  'Tiempo',
  'Presupuesto',
  'Sin respuesta',
  'Otro',
];

/**
 * La etapa a la que se puede mover, o `null` si ya está en la última.
 *
 * Devolver `null` en `cierre` es lo que apaga el botón "Avanzar": ofrecerlo ahí
 * solo llevaría a un 422.
 *
 * @param {EtapaOportunidad} etapa
 * @returns {EtapaOportunidad | null}
 */
export function siguienteEtapa(etapa) {
  const indice = ETAPAS.indexOf(etapa);
  return ETAPAS[indice + 1] ?? null;
}

/**
 * @param {EstadoOportunidad} estado
 * @returns {BadgeTono}
 */
export function tonoOportunidad(estado) {
  switch (estado) {
    case 'ganada':
      return 'exito';
    case 'perdida':
      return 'error';
    default:
      return 'info';
  }
}

/* ----------------------------------------------------------- cotizaciones */

export const ESTADO_COTIZACION_LABEL = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente de aprobación',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

/**
 * @param {EstadoCotizacion} estado
 * @returns {BadgeTono}
 */
export function tonoCotizacion(estado) {
  switch (estado) {
    case 'aprobada':
      return 'exito';
    case 'rechazada':
      return 'error';
    case 'pendiente_aprobacion':
      return 'aviso';
    default:
      return 'neutro';
  }
}

/**
 * Editable solo antes de resolverse; una aprobada o rechazada se regenera.
 *
 * @param {EstadoCotizacion} estado
 */
export function cotizacionEsEditable(estado) {
  return estado === 'borrador' || estado === 'pendiente_aprobacion';
}

/**
 * Resoluble si aún no se resolvió. Ojo: poder *resolver* no es poder *aprobar*
 * — una vencida solo admite el rechazo (§3), y eso lo comprueba
 * `cotizacionEsAprobable`.
 *
 * @param {EstadoCotizacion} estado
 */
export function cotizacionEsResoluble(estado) {
  return cotizacionEsEditable(estado);
}

/**
 * @param {EstadoCotizacion} estado
 * @param {boolean} vencida
 */
export function cotizacionEsAprobable(estado, vencida) {
  return cotizacionEsResoluble(estado) && !vencida;
}

/* ---------------------------------------------------------------- pedidos */

export const ESTADO_PEDIDO_LABEL = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  pendiente_surtido: 'Pendiente de surtido',
  cancelado: 'Cancelado',
  facturado_parcial: 'Facturado parcial',
  facturado_total: 'Facturado total',
};

/**
 * @param {EstadoPedido} estado
 * @returns {BadgeTono}
 */
export function tonoPedido(estado) {
  switch (estado) {
    case 'facturado_total':
      return 'exito';
    case 'confirmado':
      return 'info';
    case 'pendiente_surtido':
    case 'facturado_parcial':
      return 'aviso';
    case 'cancelado':
      return 'error';
    default:
      return 'neutro';
  }
}

/**
 * Confirmar es lo que reserva stock y valida crédito: solo desde borrador.
 *
 * @param {EstadoPedido} estado
 */
export function pedidoEsConfirmable(estado) {
  return estado === 'borrador';
}

/**
 * Cancelable mientras no se haya facturado nada. Con facturas emitidas la
 * corrección va por nota de crédito, no por cancelación (→ 422).
 *
 * @param {EstadoPedido} estado
 */
export function pedidoEsCancelable(estado) {
  return estado === 'borrador' || estado === 'confirmado' || estado === 'pendiente_surtido';
}

/**
 * Solo se factura lo que ya reservó stock, y mientras quede pendiente.
 *
 * @param {EstadoPedido} estado
 */
export function pedidoEsFacturable(estado) {
  return estado === 'confirmado' || estado === 'pendiente_surtido' || estado === 'facturado_parcial';
}

/**
 * Las líneas se congelan al confirmar.
 *
 * @param {EstadoPedido} estado
 */
export function pedidoEsEditable(estado) {
  return estado === 'borrador';
}

/* --------------------------------------------------------------- facturas */

export const ESTADO_FACTURA_LABEL = {
  emitida: 'Emitida',
  cancelada: 'Cancelada',
  con_nota_credito: 'Con nota de crédito',
};

/**
 * @param {EstadoFactura} estado
 * @returns {BadgeTono}
 */
export function tonoFactura(estado) {
  switch (estado) {
    case 'emitida':
      return 'exito';
    case 'con_nota_credito':
      return 'aviso';
    default:
      return 'error';
  }
}
