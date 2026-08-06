import type {
  EstadoCotizacion,
  EstadoFactura,
  EstadoOportunidad,
  EstadoPedido,
  EtapaOportunidad,
  MotivoPerdida,
} from '../../api/models';
import type { BadgeTono } from '../../shared/ui/badge/badge.component';

/**
 * Rótulos y colores de los estados de Ventas, más las reglas de transición que
 * la UI necesita para decidir qué botones ofrecer.
 *
 * Las reglas viven aquí y no repartidas por las pantallas porque son las mismas
 * que valida el backend (FLUJO-VENTAS §2–§5). Tenerlas en un sitio hace que
 * "¿se puede cancelar este pedido?" tenga una única respuesta.
 */

/* -------------------------------------------------------- oportunidades */

/** El orden **es** la regla: solo se avanza al siguiente elemento. */
export const ETAPAS: readonly EtapaOportunidad[] = [
  'prospeccion',
  'calificacion',
  'propuesta',
  'negociacion',
  'cierre',
];

export const ETAPA_LABEL: Readonly<Record<EtapaOportunidad, string>> = {
  prospeccion: 'Prospección',
  calificacion: 'Calificación',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  cierre: 'Cierre',
};

export const ESTADO_OPORTUNIDAD_LABEL: Readonly<Record<EstadoOportunidad, string>> = {
  abierta: 'Abierta',
  ganada: 'Ganada',
  perdida: 'Perdida',
};

export const MOTIVOS_PERDIDA: readonly MotivoPerdida[] = [
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
 * Devolver `null` en `cierre` es lo que apaga el botón "Avanzar": ofrecerlo
 * ahí solo llevaría a un 422.
 */
export function siguienteEtapa(etapa: EtapaOportunidad): EtapaOportunidad | null {
  const indice = ETAPAS.indexOf(etapa);
  return ETAPAS[indice + 1] ?? null;
}

export function tonoOportunidad(estado: EstadoOportunidad): BadgeTono {
  switch (estado) {
    case 'ganada':
      return 'exito';
    case 'perdida':
      return 'error';
    case 'abierta':
      return 'info';
  }
}

/* --------------------------------------------------------- cotizaciones */

export const ESTADO_COTIZACION_LABEL: Readonly<Record<EstadoCotizacion, string>> = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente de aprobación',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export function tonoCotizacion(estado: EstadoCotizacion): BadgeTono {
  switch (estado) {
    case 'aprobada':
      return 'exito';
    case 'rechazada':
      return 'error';
    case 'pendiente_aprobacion':
      return 'aviso';
    case 'borrador':
      return 'neutro';
  }
}

/** Editable solo antes de resolverse; una aprobada o rechazada se regenera. */
export function cotizacionEsEditable(estado: EstadoCotizacion): boolean {
  return estado === 'borrador' || estado === 'pendiente_aprobacion';
}

/**
 * Resoluble si aún no se resolvió. Ojo: poder *resolver* no es poder
 * *aprobar* — una vencida solo admite el rechazo (§3), y eso lo comprueba
 * `cotizacionEsAprobable`.
 */
export function cotizacionEsResoluble(estado: EstadoCotizacion): boolean {
  return cotizacionEsEditable(estado);
}

export function cotizacionEsAprobable(estado: EstadoCotizacion, vencida: boolean): boolean {
  return cotizacionEsResoluble(estado) && !vencida;
}

/* -------------------------------------------------------------- pedidos */

export const ESTADO_PEDIDO_LABEL: Readonly<Record<EstadoPedido, string>> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  pendiente_surtido: 'Pendiente de surtido',
  cancelado: 'Cancelado',
  facturado_parcial: 'Facturado parcial',
  facturado_total: 'Facturado total',
};

export function tonoPedido(estado: EstadoPedido): BadgeTono {
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
    case 'borrador':
      return 'neutro';
  }
}

/** Confirmar es lo que reserva stock y valida crédito: solo desde borrador. */
export function pedidoEsConfirmable(estado: EstadoPedido): boolean {
  return estado === 'borrador';
}

/**
 * Cancelable mientras no se haya facturado nada. Con facturas emitidas la
 * corrección va por nota de crédito, no por cancelación (→ 422).
 */
export function pedidoEsCancelable(estado: EstadoPedido): boolean {
  return estado === 'borrador' || estado === 'confirmado' || estado === 'pendiente_surtido';
}

/** Solo se factura lo que ya reservó stock, y mientras quede pendiente. */
export function pedidoEsFacturable(estado: EstadoPedido): boolean {
  return (
    estado === 'confirmado' || estado === 'pendiente_surtido' || estado === 'facturado_parcial'
  );
}

/** Las líneas se congelan al confirmar. */
export function pedidoEsEditable(estado: EstadoPedido): boolean {
  return estado === 'borrador';
}

/* ------------------------------------------------------------- facturas */

export const ESTADO_FACTURA_LABEL: Readonly<Record<EstadoFactura, string>> = {
  emitida: 'Emitida',
  cancelada: 'Cancelada',
  con_nota_credito: 'Con nota de crédito',
};

export function tonoFactura(estado: EstadoFactura): BadgeTono {
  switch (estado) {
    case 'emitida':
      return 'exito';
    case 'con_nota_credito':
      return 'aviso';
    case 'cancelada':
      return 'error';
  }
}
