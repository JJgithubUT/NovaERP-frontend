import type { DecimalString, Uuid } from './common.model';

/**
 * Movimientos y consultas de stock. Espejo de la sección Inventario del
 * `openapi.yaml`.
 *
 * La regla que gobierna todo este archivo (FLUJO-INVENTARIO §1): **el stock no
 * se edita**. Se registra un movimiento, un ajuste o una transferencia, y el
 * backend actualiza `stock_actual` y escribe en el kardex. Por eso aquí no hay
 * ningún `StockUpdate`: no existe tal endpoint y no debe inventarse.
 */

/**
 * Los seis tipos del ENUM `inventario.movimiento_tipo`.
 *
 * Solo `entrada` y `salida` se pueden mandar a `POST /movimientos/`; los otros
 * cuatro los genera el backend a partir de ajustes y transferencias. De ahí que
 * `MovimientoCreate.tipo` sea más estrecho que este tipo.
 */
export type TipoMovimiento =
  | 'entrada'
  | 'salida'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'transferencia_salida'
  | 'transferencia_entrada';

export type MotivoAjuste = 'conteo_fisico' | 'merma' | 'otro';

/** El id es entero, no UUID: la tabla de movimientos usa secuencial. */
export interface Movimiento {
  id: number;
  producto_id: Uuid;
  almacen_id: Uuid;
  tipo: TipoMovimiento;
  cantidad: DecimalString;
  costo_unitario: DecimalString | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  ocurrido_en: string;
}

export interface MovimientoCreate {
  /** Solo manual: los demás tipos los deriva el backend. */
  tipo: 'entrada' | 'salida';
  producto_id: Uuid;
  almacen_id: Uuid;
  cantidad: DecimalString;
  costo_unitario?: DecimalString;
}

export interface AjusteInventario {
  id: Uuid;
  producto_id: Uuid;
  almacen_id: Uuid;
  motivo: MotivoAjuste;
  /** Positivo suma, negativo resta. Nunca cero. */
  cantidad: DecimalString;
  aprobado_por: Uuid | null;
  created_at: string;
}

export interface AjusteCreate {
  motivo: MotivoAjuste;
  producto_id: Uuid;
  almacen_id: Uuid;
  cantidad: DecimalString;
}

/**
 * No tiene `estado`: la transferencia es atómica (salida + entrada en la misma
 * transacción). O existe entera o no existe — no hay "pendiente" que completar.
 */
export interface Transferencia {
  id: Uuid;
  producto_id: Uuid;
  almacen_origen_id: Uuid;
  almacen_destino_id: Uuid;
  cantidad: DecimalString;
  created_at: string;
}

export interface TransferenciaCreate {
  producto_id: Uuid;
  almacen_origen_id: Uuid;
  almacen_destino_id: Uuid;
  cantidad: DecimalString;
}

/**
 * Fila de `v_stock_disponible`. Ojo: la vista **no expone los UUID** de producto
 * ni de almacén, solo su clave natural (`sku` y el nombre). Por eso estas filas
 * no se pueden enlazar por id — para filtrar se manda `producto_id`/`almacen_id`
 * y el backend los traduce.
 */
export interface StockDisponible {
  sku: string;
  producto: string;
  almacen: string;
  cantidad: DecimalString;
  reservado: DecimalString;
  /** `cantidad − reservado`. Es lo vendible, y lo que hay que mostrar. */
  disponible: DecimalString;
}

/** Fila del kardex. `movimiento_id` es la clave: la vista no tiene `id` propio. */
export interface FilaKardex {
  movimiento_id: number;
  sku: string;
  producto: string;
  almacen: string;
  tipo: TipoMovimiento;
  cantidad: DecimalString;
  costo_unitario: DecimalString | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  ocurrido_en: string;
}

export interface FilaValuacion {
  sku: string;
  producto: string;
  almacen: string;
  cantidad: DecimalString;
  costo_referencia: DecimalString;
  /** `cantidad × costo_referencia`, ya calculado por la vista. */
  valor_total: DecimalString;
}

/** Id secuencial, no UUID: así lo documenta el openapi para esta tabla. */
export interface AlertaStockMinimo {
  id: number;
  producto_id: Uuid;
  almacen_id: Uuid;
  /** Existencia en el instante del disparo, no la actual. */
  cantidad_al_disparo: DecimalString;
  disparada_en: string;
  notificada: boolean;
}

/* ------------------------------------------------------------- filtros */

export interface MovimientoQuery {
  page?: number;
  page_size?: number;
  producto_id?: Uuid;
  almacen_id?: Uuid;
  tipo?: TipoMovimiento;
  /** `YYYY-MM-DD`. Acota por `ocurrido_en`. */
  desde?: string;
  hasta?: string;
}

/**
 * El kardex acepta además la clave natural. `almacen` es el **nombre exacto**,
 * no un `search`: el backend compara por igualdad.
 */
export interface KardexQuery extends MovimientoQuery {
  sku?: string;
  almacen?: string;
}

export interface AjusteQuery {
  page?: number;
  page_size?: number;
  producto_id?: Uuid;
  almacen_id?: Uuid;
  desde?: string;
  hasta?: string;
}

export interface TransferenciaQuery {
  page?: number;
  page_size?: number;
  producto_id?: Uuid;
  almacen_origen_id?: Uuid;
  almacen_destino_id?: Uuid;
  desde?: string;
  hasta?: string;
}

export interface StockQuery {
  page?: number;
  page_size?: number;
  producto_id?: Uuid;
  almacen_id?: Uuid;
}

export interface AlertaQuery extends StockQuery {
  notificada?: boolean;
}
