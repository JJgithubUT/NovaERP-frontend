import type { DecimalString, Uuid } from './common.model';

/**
 * Cadena de abastecimiento: proveedor → orden de compra → recepción → cuenta
 * por pagar. Espejo de la sección Compras del `openapi.yaml`.
 *
 * La pieza que mueve todo es la **recepción**: suma stock (movimiento de
 * entrada en inventario) y crea la deuda con el proveedor. No hay "deshacer
 * recepción" — una corrección se hace con un ajuste de inventario.
 */

export type EstadoOrdenCompra =
  'pendiente_aprobacion' | 'enviada' | 'recibida_parcial' | 'recibida_total' | 'cancelada';

export interface OrdenCompraLinea {
  id: Uuid;
  producto_id: Uuid;
  cantidad: DecimalString;
  /** Lo ya recibido. `cantidad − cantidad_recibida` es lo pendiente. */
  cantidad_recibida: DecimalString;
  costo_unitario: DecimalString;
}

export interface OrdenCompra {
  id: Uuid;
  /** Autogenerado por el backend (`OC-000123`). */
  folio: string;
  proveedor_id: Uuid;
  estado: EstadoOrdenCompra;
  total: DecimalString;
  lineas: OrdenCompraLinea[];
  created_at: string;
  updated_at: string;
}

export interface OrdenCompraLineaInput {
  producto_id: Uuid;
  cantidad: DecimalString;
  /** Obligatorio, a diferencia de las líneas de venta. */
  costo_unitario: DecimalString;
}

export interface OrdenCompraCreate {
  proveedor_id: Uuid;
  lineas: OrdenCompraLineaInput[];
}

/**
 * El mismo PATCH sirve para editar y para aprobar.
 *
 * Aprobar es literalmente mandar `estado: 'enviada'`: no hay motor de workflow
 * ni endpoint dedicado, es una aprobación manual (FLUJO-COMPRAS §3). Por eso el
 * único valor admitido es ese — el resto de transiciones las provoca el
 * sistema.
 */
export interface OrdenCompraUpdate {
  proveedor_id?: Uuid;
  lineas?: OrdenCompraLineaInput[];
  estado?: 'enviada';
}

export interface RecepcionLinea {
  id: Uuid;
  orden_compra_linea_id: Uuid;
  cantidad: DecimalString;
  costo_unitario: DecimalString;
}

export interface Recepcion {
  id: Uuid;
  orden_id: Uuid;
  almacen_id: Uuid;
  recibido_por: Uuid | null;
  lineas: RecepcionLinea[];
  created_at: string;
}

export interface RecepcionLineaInput {
  orden_compra_linea_id: Uuid;
  /** No puede exceder lo pendiente de esa línea (→ 422). */
  cantidad: DecimalString;
  /**
   * Costo real facturado por el proveedor. Es opcional en el contrato, pero
   * **mándalo siempre**: si se omite el backend toma 0 y con eso recalcula el
   * `costo_referencia` del producto, dejándolo en cero.
   */
  costo_unitario?: DecimalString;
}

export interface RecepcionCreate {
  orden_id: Uuid;
  /** A qué almacén entra la mercancía. */
  almacen_id: Uuid;
  lineas: RecepcionLineaInput[];
}

/** Se crean solas en cada recepción. Desde Compras son de solo lectura. */
export interface CuentaPorPagar {
  id: Uuid;
  proveedor_id: Uuid;
  /** Documento que la originó, p. ej. `recepcion_mercancia`. */
  origen_tipo: string;
  origen_id: string;
  monto_original: DecimalString;
  saldo: DecimalString;
  created_at: string;
}

export interface ConfigAprobacion {
  tenant_id: Uuid;
  /** Una orden cuyo total lo supere nace en `pendiente_aprobacion`. */
  umbral_monto: DecimalString;
}

export interface ConfigAprobacionUpdate {
  umbral_monto: DecimalString;
}

/** RF-51: la ficha completa del proveedor. No está paginada. */
export interface HistorialProveedor {
  proveedor_id: Uuid;
  razon_social: string;
  ordenes: OrdenCompra[];
  recepciones: Recepcion[];
  cuentas_por_pagar: CuentaPorPagar[];
}

/* -------------------------------------------------------------- filtros */

interface RangoFechas {
  page?: number;
  page_size?: number;
  /** `YYYY-MM-DD`. Acota por `created_at`. */
  desde?: string;
  hasta?: string;
}

export interface OrdenCompraQuery extends RangoFechas {
  estado?: EstadoOrdenCompra;
  proveedor_id?: Uuid;
}

export interface RecepcionQuery extends RangoFechas {
  orden_id?: Uuid;
  almacen_id?: Uuid;
}

export interface CuentaPorPagarQuery extends RangoFechas {
  proveedor_id?: Uuid;
}
