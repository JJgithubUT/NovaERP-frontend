/** @typedef {import('./common.model.js').DecimalString} DecimalString */
/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * Cadena de abastecimiento: proveedor → orden de compra → recepción → cuenta
 * por pagar. Espejo de la sección Compras del `openapi.yaml`.
 *
 * La pieza que mueve todo es la **recepción**: suma stock (movimiento de
 * entrada en inventario) y crea la deuda con el proveedor. No hay "deshacer
 * recepción" — una corrección se hace con un ajuste de inventario.
 *
 * @typedef {'pendiente_aprobacion' | 'enviada' | 'recibida_parcial' | 'recibida_total' | 'cancelada'} EstadoOrdenCompra
 */

/**
 * @typedef {object} OrdenCompraLinea
 * @property {Uuid} id
 * @property {Uuid} producto_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} cantidad_recibida Lo ya recibido. `cantidad − cantidad_recibida` es lo pendiente.
 * @property {DecimalString} costo_unitario
 */

/**
 * @typedef {object} OrdenCompra
 * @property {Uuid} id
 * @property {string} folio Autogenerado por el backend (`OC-000123`).
 * @property {Uuid} proveedor_id
 * @property {EstadoOrdenCompra} estado
 * @property {DecimalString} total
 * @property {OrdenCompraLinea[]} lineas
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {object} OrdenCompraLineaInput
 * @property {Uuid} producto_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} costo_unitario Obligatorio, a diferencia de las líneas de venta.
 */

/**
 * @typedef {object} OrdenCompraCreate
 * @property {Uuid} proveedor_id
 * @property {OrdenCompraLineaInput[]} lineas
 */

/**
 * El mismo PATCH sirve para editar y para aprobar.
 *
 * Aprobar es literalmente mandar `estado: 'enviada'`: no hay motor de workflow
 * ni endpoint dedicado, es una aprobación manual (FLUJO-COMPRAS §3). Por eso el
 * único valor admitido es ese — el resto de transiciones las provoca el
 * sistema.
 *
 * @typedef {object} OrdenCompraUpdate
 * @property {Uuid} [proveedor_id]
 * @property {OrdenCompraLineaInput[]} [lineas]
 * @property {'enviada'} [estado]
 */

/**
 * @typedef {object} RecepcionLinea
 * @property {Uuid} id
 * @property {Uuid} orden_compra_linea_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} costo_unitario
 */

/**
 * @typedef {object} Recepcion
 * @property {Uuid} id
 * @property {Uuid} orden_id
 * @property {Uuid} almacen_id
 * @property {Uuid | null} recibido_por
 * @property {RecepcionLinea[]} lineas
 * @property {string} created_at
 */

/**
 * @typedef {object} RecepcionLineaInput
 * @property {Uuid} orden_compra_linea_id
 * @property {DecimalString} cantidad No puede exceder lo pendiente de esa línea (→ 422).
 * @property {DecimalString} [costo_unitario] Costo real facturado por el proveedor. Es opcional en el contrato, pero **mándalo siempre**: si se omite el backend toma 0 y con eso recalcula el `costo_referencia` del producto, dejándolo en cero.
 */

/**
 * @typedef {object} RecepcionCreate
 * @property {Uuid} orden_id
 * @property {Uuid} almacen_id A qué almacén entra la mercancía.
 * @property {RecepcionLineaInput[]} lineas
 */

/**
 * Se crean solas en cada recepción. Desde Compras son de solo lectura.
 *
 * @typedef {object} CuentaPorPagar
 * @property {Uuid} id
 * @property {Uuid} proveedor_id
 * @property {string} origen_tipo Documento que la originó, p. ej. `recepcion_mercancia`.
 * @property {string} origen_id
 * @property {DecimalString} monto_original
 * @property {DecimalString} saldo
 * @property {string} created_at
 */

/**
 * @typedef {object} ConfigAprobacion
 * @property {Uuid} tenant_id
 * @property {DecimalString} umbral_monto Una orden cuyo total lo supere nace en `pendiente_aprobacion`.
 */

/**
 * @typedef {object} ConfigAprobacionUpdate
 * @property {DecimalString} umbral_monto
 */

/**
 * RF-51: la ficha completa del proveedor. No está paginada.
 *
 * @typedef {object} HistorialProveedor
 * @property {Uuid} proveedor_id
 * @property {string} razon_social
 * @property {OrdenCompra[]} ordenes
 * @property {Recepcion[]} recepciones
 * @property {CuentaPorPagar[]} cuentas_por_pagar
 */

/**
 * @typedef {object} RangoFechas
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {string} [desde] `YYYY-MM-DD`. Acota por `created_at`.
 * @property {string} [hasta]
 */

/**
 * @typedef {object} OrdenCompraQuery
 * @see RangoFechas (hereda sus propiedades)
 * @property {EstadoOrdenCompra} [estado]
 * @property {Uuid} [proveedor_id]
 */

/**
 * @typedef {object} RecepcionQuery
 * @see RangoFechas (hereda sus propiedades)
 * @property {Uuid} [orden_id]
 * @property {Uuid} [almacen_id]
 */

/**
 * @typedef {object} CuentaPorPagarQuery
 * @see RangoFechas (hereda sus propiedades)
 * @property {Uuid} [proveedor_id]
 */

export {};
