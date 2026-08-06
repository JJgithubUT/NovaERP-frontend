import type { DecimalString, Uuid } from './common.model';

/**
 * La cadena comercial: oportunidad → cotización → pedido → factura → nota de
 * crédito. Espejo de la sección Ventas del `openapi.yaml`.
 *
 * Casi todo el módulo es una máquina de estados, y los tipos la reflejan: los
 * estados son uniones cerradas, no `string`. Si el backend añade uno nuevo, el
 * compilador señala cada `switch` que hay que revisar en vez de dejar la UI
 * pintando una etiqueta vacía.
 */

/* -------------------------------------------------------- oportunidades */

/** En orden. Solo se avanza a la siguiente: ni se salta ni se retrocede. */
export type EtapaOportunidad =
  'prospeccion' | 'calificacion' | 'propuesta' | 'negociacion' | 'cierre';

export type EstadoOportunidad = 'abierta' | 'ganada' | 'perdida';

/** Catálogo cerrado del backend. `perdida` exige uno de estos. */
export type MotivoPerdida =
  'Precio' | 'Competencia' | 'Tiempo' | 'Presupuesto' | 'Sin respuesta' | 'Otro';

export interface Oportunidad {
  id: Uuid;
  cliente_id: Uuid;
  nombre: string;
  valor_estimado: DecimalString | null;
  fecha_cierre_estimada: string | null;
  etapa: EtapaOportunidad;
  estado: EstadoOportunidad;
  /** Derivada de la etapa (0–100). No se manda al crear. */
  probabilidad: number;
  /** `valor_estimado × probabilidad`, ya calculado por el backend. */
  valor_ponderado: DecimalString;
  motivo_perdida: string | null;
  responsable_id: Uuid | null;
  created_at: string;
  updated_at: string;
}

export interface OportunidadCreate {
  cliente_id: Uuid;
  nombre: string;
  valor_estimado?: DecimalString;
  /** `YYYY-MM-DD`. El backend rechaza fechas anteriores a hoy. */
  fecha_cierre_estimada?: string;
}

/** Solo estos tres campos, y solo mientras la oportunidad siga abierta. */
export interface OportunidadUpdate {
  nombre?: string;
  valor_estimado?: DecimalString;
  fecha_cierre_estimada?: string;
}

export interface CierreOportunidad {
  estado: 'ganada' | 'perdida';
  /** Obligatorio si `estado === 'perdida'`. */
  motivo_perdida?: MotivoPerdida;
}

/** Una columna del kanban: el agregado de la etapa, no sus oportunidades. */
export interface EtapaPipeline {
  etapa: EtapaOportunidad;
  num_oportunidades: number;
  valor_total: DecimalString;
  probabilidad: number;
  valor_ponderado: DecimalString;
}

export interface Pipeline {
  etapas: EtapaPipeline[];
  valor_ponderado_total: DecimalString;
}

/* --------------------------------------------------------- cotizaciones */

export type EstadoCotizacion = 'borrador' | 'pendiente_aprobacion' | 'aprobada' | 'rechazada';

export interface CotizacionLinea {
  id: Uuid;
  producto_id: Uuid;
  descripcion: string;
  cantidad: DecimalString;
  precio_unitario: DecimalString;
  /** `cantidad × precio_unitario`, calculado por el backend. */
  importe: DecimalString;
}

export interface CotizacionLineaInput {
  producto_id: Uuid;
  cantidad: DecimalString;
  /** Omitir para usar el precio del catálogo. Fijarlo exige permiso. */
  precio_unitario?: DecimalString;
  descripcion?: string;
}

export interface Cotizacion {
  id: Uuid;
  folio: string;
  cliente_id: Uuid;
  oportunidad_id: Uuid | null;
  vendedor_id: Uuid | null;
  estado: EstadoCotizacion;
  /**
   * Derivado de `vigente_hasta`, no un estado almacenado. Una cotización
   * vencida no se puede aprobar aunque siga en borrador.
   */
  vencida: boolean;
  subtotal: DecimalString;
  descuento_pct: DecimalString;
  /** `subtotal − descuento`. La cotización **no** desglosa impuestos. */
  total: DecimalString;
  vigente_hasta: string | null;
  lineas: CotizacionLinea[];
  created_at: string;
  updated_at: string;
}

export interface CotizacionCreate {
  cliente_id: Uuid;
  oportunidad_id?: Uuid;
  /** 0–100. Si supera el máximo del tenant, nace en `pendiente_aprobacion`. */
  descuento_pct?: DecimalString;
  vigente_hasta?: string;
  lineas: CotizacionLineaInput[];
}

/** Solo editable en `borrador` o `pendiente_aprobacion`. */
export interface CotizacionUpdate {
  descuento_pct?: DecimalString;
  vigente_hasta?: string;
  lineas?: CotizacionLineaInput[];
}

export interface ResolverCotizacion {
  decision: 'aprobar' | 'rechazar';
}

/* -------------------------------------------------------------- pedidos */

export type EstadoPedido =
  | 'borrador'
  | 'confirmado'
  | 'pendiente_surtido'
  | 'cancelado'
  | 'facturado_parcial'
  | 'facturado_total';

export interface PedidoLinea {
  id: Uuid;
  producto_id: Uuid;
  cantidad: DecimalString;
  cantidad_facturada: DecimalString;
  cantidad_reservada: DecimalString;
  precio_unitario: DecimalString;
  /** Lo que todavía se puede facturar de esta línea. */
  pendiente_facturar: DecimalString;
}

export interface Pedido {
  id: Uuid;
  folio: string;
  cliente_id: Uuid;
  cotizacion_id: Uuid | null;
  /** Se fija al confirmar: es el almacén del que se surte. */
  almacen_id: Uuid | null;
  vendedor_id: Uuid | null;
  estado: EstadoPedido;
  total: DecimalString;
  lineas: PedidoLinea[];
  created_at: string;
  updated_at: string;
}

export interface PedidoLineaInput {
  producto_id: Uuid;
  cantidad: DecimalString;
  precio_unitario?: DecimalString;
}

/**
 * Dos formas excluyentes de nacer: desde una cotización **aprobada**, o directo
 * con cliente y líneas.
 */
export type PedidoCreate =
  { cotizacion_id: Uuid } | { cliente_id: Uuid; lineas: PedidoLineaInput[] };

/** Solo en `borrador`. Confirmar congela las líneas. */
export interface PedidoUpdate {
  lineas: PedidoLineaInput[];
}

export interface ConfirmarPedido {
  almacen_id: Uuid;
  /**
   * Fuerza la confirmación por encima del límite de crédito del cliente.
   * Exige el permiso `finanzas:credito:autorizar`; sin él, 403.
   */
  autorizar_credito?: boolean;
}

/* ------------------------------------------------------------- facturas */

export type EstadoFactura = 'emitida' | 'cancelada' | 'con_nota_credito';

export interface FacturaLinea {
  id: Uuid;
  pedido_linea_id: Uuid;
  cantidad: DecimalString;
  precio_unitario: DecimalString;
  importe: DecimalString;
}

export interface Factura {
  id: Uuid;
  folio: string;
  pedido_id: Uuid;
  cliente_id: Uuid;
  vendedor_id: Uuid | null;
  estado: EstadoFactura;
  subtotal: DecimalString;
  /** `subtotal × IVA del tenant`. Aquí sí se desglosa, en la cotización no. */
  impuestos: DecimalString;
  total: DecimalString;
  fecha_emision: string;
  /** Saldo vivo de la cuenta por cobrar. Es el tope de una nota de crédito. */
  cxc_saldo: DecimalString | null;
  lineas: FacturaLinea[];
}

export interface FacturaLineaInput {
  pedido_linea_id: Uuid;
  cantidad: DecimalString;
}

export interface FacturaCreate {
  pedido_id: Uuid;
  /** Omitir para facturar todo lo pendiente y reservado. */
  lineas?: FacturaLineaInput[];
}

export interface NotaCreditoCreate {
  motivo: string;
  /** Mayor que 0 y no mayor que `cxc_saldo`. */
  monto: DecimalString;
  /** Solo aplica en una nota de crédito total. */
  reingresar_stock?: boolean;
}

/* -------------------------------------------------------------- filtros */

interface RangoFechas {
  page?: number;
  page_size?: number;
  /** `YYYY-MM-DD`. */
  desde?: string;
  hasta?: string;
}

export interface OportunidadQuery extends RangoFechas {
  estado?: EstadoOportunidad;
  etapa?: EtapaOportunidad;
  cliente_id?: Uuid;
  responsable_id?: Uuid;
}

export interface CotizacionQuery extends RangoFechas {
  cliente_id?: Uuid;
  estado?: EstadoCotizacion;
  /** `true` acota a las vencidas que aún no se resolvieron. */
  vencida?: boolean;
}

export interface PedidoQuery extends RangoFechas {
  cliente_id?: Uuid;
  estado?: EstadoPedido;
}

export interface FacturaQuery extends RangoFechas {
  cliente_id?: Uuid;
  estado?: EstadoFactura;
  pedido_id?: Uuid;
}
