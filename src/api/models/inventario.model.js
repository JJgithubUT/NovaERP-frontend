/** @typedef {import('./common.model.js').DecimalString} DecimalString */
/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * Los seis tipos del ENUM `inventario.movimiento_tipo`.
 *
 * Solo `entrada` y `salida` se pueden mandar a `POST /movimientos/`; los otros
 * cuatro los genera el backend a partir de ajustes y transferencias. De ahí que
 * `MovimientoCreate.tipo` sea más estrecho que este tipo.
 *
 * @typedef {| 'entrada' | 'salida' | 'ajuste_positivo' | 'ajuste_negativo' | 'transferencia_salida' | 'transferencia_entrada'} TipoMovimiento
 */

/**
 * @typedef {'conteo_fisico' | 'merma' | 'otro'} MotivoAjuste
 */

/**
 * El id es entero, no UUID: la tabla de movimientos usa secuencial.
 *
 * @typedef {object} Movimiento
 * @property {number} id
 * @property {Uuid} producto_id
 * @property {Uuid} almacen_id
 * @property {TipoMovimiento} tipo
 * @property {DecimalString} cantidad
 * @property {DecimalString | null} costo_unitario
 * @property {string | null} referencia_tipo
 * @property {string | null} referencia_id
 * @property {string} ocurrido_en
 */

/**
 * @typedef {object} MovimientoCreate
 * @property {'entrada' | 'salida'} tipo Solo manual: los demás tipos los deriva el backend.
 * @property {Uuid} producto_id
 * @property {Uuid} almacen_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} [costo_unitario]
 */

/**
 * @typedef {object} AjusteInventario
 * @property {Uuid} id
 * @property {Uuid} producto_id
 * @property {Uuid} almacen_id
 * @property {MotivoAjuste} motivo
 * @property {DecimalString} cantidad Positivo suma, negativo resta. Nunca cero.
 * @property {Uuid | null} aprobado_por
 * @property {string} created_at
 */

/**
 * @typedef {object} AjusteCreate
 * @property {MotivoAjuste} motivo
 * @property {Uuid} producto_id
 * @property {Uuid} almacen_id
 * @property {DecimalString} cantidad
 */

/**
 * No tiene `estado`: la transferencia es atómica (salida + entrada en la misma
 * transacción). O existe entera o no existe — no hay "pendiente" que completar.
 *
 * @typedef {object} Transferencia
 * @property {Uuid} id
 * @property {Uuid} producto_id
 * @property {Uuid} almacen_origen_id
 * @property {Uuid} almacen_destino_id
 * @property {DecimalString} cantidad
 * @property {string} created_at
 */

/**
 * @typedef {object} TransferenciaCreate
 * @property {Uuid} producto_id
 * @property {Uuid} almacen_origen_id
 * @property {Uuid} almacen_destino_id
 * @property {DecimalString} cantidad
 */

/**
 * Fila de `v_stock_disponible`. Ojo: la vista **no expone los UUID** de producto
 * ni de almacén, solo su clave natural (`sku` y el nombre). Por eso estas filas
 * no se pueden enlazar por id — para filtrar se manda `producto_id`/`almacen_id`
 * y el backend los traduce.
 *
 * @typedef {object} StockDisponible
 * @property {string} sku
 * @property {string} producto
 * @property {string} almacen
 * @property {DecimalString} cantidad
 * @property {DecimalString} reservado
 * @property {DecimalString} disponible `cantidad − reservado`. Es lo vendible, y lo que hay que mostrar.
 */

/**
 * Fila del kardex. `movimiento_id` es la clave: la vista no tiene `id` propio.
 *
 * @typedef {object} FilaKardex
 * @property {number} movimiento_id
 * @property {string} sku
 * @property {string} producto
 * @property {string} almacen
 * @property {TipoMovimiento} tipo
 * @property {DecimalString} cantidad
 * @property {DecimalString | null} costo_unitario
 * @property {string | null} referencia_tipo
 * @property {string | null} referencia_id
 * @property {string} ocurrido_en
 */

/**
 * @typedef {object} FilaValuacion
 * @property {string} sku
 * @property {string} producto
 * @property {string} almacen
 * @property {DecimalString} cantidad
 * @property {DecimalString} costo_referencia
 * @property {DecimalString} valor_total `cantidad × costo_referencia`, ya calculado por la vista.
 */

/**
 * Id secuencial, no UUID: así lo documenta el openapi para esta tabla.
 *
 * @typedef {object} AlertaStockMinimo
 * @property {number} id
 * @property {Uuid} producto_id
 * @property {Uuid} almacen_id
 * @property {DecimalString} cantidad_al_disparo Existencia en el instante del disparo, no la actual.
 * @property {string} disparada_en
 * @property {boolean} notificada
 */

/**
 * @typedef {object} MovimientoQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {Uuid} [producto_id]
 * @property {Uuid} [almacen_id]
 * @property {TipoMovimiento} [tipo]
 * @property {string} [desde] `YYYY-MM-DD`. Acota por `ocurrido_en`.
 * @property {string} [hasta]
 */

/**
 * El kardex acepta además la clave natural. `almacen` es el **nombre exacto**,
 * no un `search`: el backend compara por igualdad.
 *
 * @typedef {object} KardexQuery
 * @see MovimientoQuery (hereda sus propiedades)
 * @property {string} [sku]
 * @property {string} [almacen]
 */

/**
 * @typedef {object} AjusteQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {Uuid} [producto_id]
 * @property {Uuid} [almacen_id]
 * @property {string} [desde]
 * @property {string} [hasta]
 */

/**
 * @typedef {object} TransferenciaQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {Uuid} [producto_id]
 * @property {Uuid} [almacen_origen_id]
 * @property {Uuid} [almacen_destino_id]
 * @property {string} [desde]
 * @property {string} [hasta]
 */

/**
 * @typedef {object} StockQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {Uuid} [producto_id]
 * @property {Uuid} [almacen_id]
 */

/**
 * @typedef {object} AlertaQuery
 * @see StockQuery (hereda sus propiedades)
 * @property {boolean} [notificada]
 */

export {};
