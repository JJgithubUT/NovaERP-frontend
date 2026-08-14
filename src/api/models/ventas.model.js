/** @typedef {import('./common.model.js').DecimalString} DecimalString */
/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * En orden. Solo se avanza a la siguiente: ni se salta ni se retrocede.
 *
 * @typedef {'prospeccion' | 'calificacion' | 'propuesta' | 'negociacion' | 'cierre'} EtapaOportunidad
 */

/**
 * @typedef {'abierta' | 'ganada' | 'perdida'} EstadoOportunidad
 */

/**
 * Catálogo cerrado del backend. `perdida` exige uno de estos.
 *
 * @typedef {'Precio' | 'Competencia' | 'Tiempo' | 'Presupuesto' | 'Sin respuesta' | 'Otro'} MotivoPerdida
 */

/**
 * @typedef {object} Oportunidad
 * @property {Uuid} id
 * @property {Uuid} cliente_id
 * @property {string} nombre
 * @property {DecimalString | null} valor_estimado
 * @property {string | null} fecha_cierre_estimada
 * @property {EtapaOportunidad} etapa
 * @property {EstadoOportunidad} estado
 * @property {number} probabilidad Derivada de la etapa (0–100). No se manda al crear.
 * @property {DecimalString} valor_ponderado `valor_estimado × probabilidad`, ya calculado por el backend.
 * @property {string | null} motivo_perdida
 * @property {Uuid | null} responsable_id
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {object} OportunidadCreate
 * @property {Uuid} cliente_id
 * @property {string} nombre
 * @property {DecimalString} [valor_estimado]
 * @property {string} [fecha_cierre_estimada] `YYYY-MM-DD`. El backend rechaza fechas anteriores a hoy.
 */

/**
 * Solo estos tres campos, y solo mientras la oportunidad siga abierta.
 *
 * @typedef {object} OportunidadUpdate
 * @property {string} [nombre]
 * @property {DecimalString} [valor_estimado]
 * @property {string} [fecha_cierre_estimada]
 */

/**
 * @typedef {object} CierreOportunidad
 * @property {'ganada' | 'perdida'} estado
 * @property {MotivoPerdida} [motivo_perdida] Obligatorio si `estado === 'perdida'`.
 */

/**
 * Una columna del kanban: el agregado de la etapa, no sus oportunidades.
 *
 * @typedef {object} EtapaPipeline
 * @property {EtapaOportunidad} etapa
 * @property {number} num_oportunidades
 * @property {DecimalString} valor_total
 * @property {number} probabilidad
 * @property {DecimalString} valor_ponderado
 */

/**
 * @typedef {object} Pipeline
 * @property {EtapaPipeline[]} etapas
 * @property {DecimalString} valor_ponderado_total
 */

/**
 * @typedef {'borrador' | 'pendiente_aprobacion' | 'aprobada' | 'rechazada'} EstadoCotizacion
 */

/**
 * @typedef {object} CotizacionLinea
 * @property {Uuid} id
 * @property {Uuid} producto_id
 * @property {string} descripcion
 * @property {DecimalString} cantidad
 * @property {DecimalString} precio_unitario
 * @property {DecimalString} importe `cantidad × precio_unitario`, calculado por el backend.
 */

/**
 * @typedef {object} CotizacionLineaInput
 * @property {Uuid} producto_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} [precio_unitario] Omitir para usar el precio del catálogo. Fijarlo exige permiso.
 * @property {string} [descripcion]
 */

/**
 * @typedef {object} Cotizacion
 * @property {Uuid} id
 * @property {string} folio
 * @property {Uuid} cliente_id
 * @property {Uuid | null} oportunidad_id
 * @property {Uuid | null} vendedor_id
 * @property {EstadoCotizacion} estado
 * @property {boolean} vencida Derivado de `vigente_hasta`, no un estado almacenado. Una cotización vencida no se puede aprobar aunque siga en borrador.
 * @property {DecimalString} subtotal
 * @property {DecimalString} descuento_pct
 * @property {DecimalString} total `subtotal − descuento`. La cotización **no** desglosa impuestos.
 * @property {string | null} vigente_hasta
 * @property {CotizacionLinea[]} lineas
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {object} CotizacionCreate
 * @property {Uuid} cliente_id
 * @property {Uuid} [oportunidad_id]
 * @property {DecimalString} [descuento_pct] 0–100. Si supera el máximo del tenant, nace en `pendiente_aprobacion`.
 * @property {string} [vigente_hasta]
 * @property {CotizacionLineaInput[]} lineas
 */

/**
 * Solo editable en `borrador` o `pendiente_aprobacion`.
 *
 * @typedef {object} CotizacionUpdate
 * @property {DecimalString} [descuento_pct]
 * @property {string} [vigente_hasta]
 * @property {CotizacionLineaInput[]} [lineas]
 */

/**
 * @typedef {object} ResolverCotizacion
 * @property {'aprobar' | 'rechazar'} decision
 */

/**
 * @typedef {| 'borrador' | 'confirmado' | 'pendiente_surtido' | 'cancelado' | 'facturado_parcial' | 'facturado_total'} EstadoPedido
 */

/**
 * @typedef {object} PedidoLinea
 * @property {Uuid} id
 * @property {Uuid} producto_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} cantidad_facturada
 * @property {DecimalString} cantidad_reservada
 * @property {DecimalString} precio_unitario
 * @property {DecimalString} pendiente_facturar Lo que todavía se puede facturar de esta línea.
 */

/**
 * @typedef {object} Pedido
 * @property {Uuid} id
 * @property {string} folio
 * @property {Uuid} cliente_id
 * @property {Uuid | null} cotizacion_id
 * @property {Uuid | null} almacen_id Se fija al confirmar: es el almacén del que se surte.
 * @property {Uuid | null} vendedor_id
 * @property {EstadoPedido} estado
 * @property {DecimalString} total
 * @property {PedidoLinea[]} lineas
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {object} PedidoLineaInput
 * @property {Uuid} producto_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} [precio_unitario]
 */

/**
 * Dos formas excluyentes de nacer: desde una cotización **aprobada**, o directo
 * con cliente y líneas.
 *
 * @typedef {{ cotizacion_id: Uuid } | { cliente_id: Uuid; lineas: PedidoLineaInput[] }} PedidoCreate
 */

/**
 * Solo en `borrador`. Confirmar congela las líneas.
 *
 * @typedef {object} PedidoUpdate
 * @property {PedidoLineaInput[]} lineas
 */

/**
 * @typedef {object} ConfirmarPedido
 * @property {Uuid} almacen_id
 * @property {boolean} [autorizar_credito] Fuerza la confirmación por encima del límite de crédito del cliente. Exige el permiso `finanzas:credito:autorizar`; sin él, 403.
 */

/**
 * @typedef {'emitida' | 'cancelada' | 'con_nota_credito'} EstadoFactura
 */

/**
 * @typedef {object} FacturaLinea
 * @property {Uuid} id
 * @property {Uuid} pedido_linea_id
 * @property {DecimalString} cantidad
 * @property {DecimalString} precio_unitario
 * @property {DecimalString} importe
 */

/**
 * @typedef {object} Factura
 * @property {Uuid} id
 * @property {string} folio
 * @property {Uuid} pedido_id
 * @property {Uuid} cliente_id
 * @property {Uuid | null} vendedor_id
 * @property {EstadoFactura} estado
 * @property {DecimalString} subtotal
 * @property {DecimalString} impuestos `subtotal × IVA del tenant`. Aquí sí se desglosa, en la cotización no.
 * @property {DecimalString} total
 * @property {string} fecha_emision
 * @property {DecimalString | null} cxc_saldo Saldo vivo de la cuenta por cobrar. Es el tope de una nota de crédito.
 * @property {FacturaLinea[]} lineas
 */

/**
 * @typedef {object} FacturaLineaInput
 * @property {Uuid} pedido_linea_id
 * @property {DecimalString} cantidad
 */

/**
 * @typedef {object} FacturaCreate
 * @property {Uuid} pedido_id
 * @property {FacturaLineaInput[]} [lineas] Omitir para facturar todo lo pendiente y reservado.
 */

/**
 * @typedef {object} NotaCreditoCreate
 * @property {string} motivo
 * @property {DecimalString} monto Mayor que 0 y no mayor que `cxc_saldo`.
 * @property {boolean} [reingresar_stock] Solo aplica en una nota de crédito total.
 */

/**
 * @typedef {object} RangoFechas
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {string} [desde] `YYYY-MM-DD`.
 * @property {string} [hasta]
 */

/**
 * @typedef {object} OportunidadQuery
 * @see RangoFechas (hereda sus propiedades)
 * @property {EstadoOportunidad} [estado]
 * @property {EtapaOportunidad} [etapa]
 * @property {Uuid} [cliente_id]
 * @property {Uuid} [responsable_id]
 */

/**
 * @typedef {object} CotizacionQuery
 * @see RangoFechas (hereda sus propiedades)
 * @property {Uuid} [cliente_id]
 * @property {EstadoCotizacion} [estado]
 * @property {boolean} [vencida] `true` acota a las vencidas que aún no se resolvieron.
 */

/**
 * @typedef {object} PedidoQuery
 * @see RangoFechas (hereda sus propiedades)
 * @property {Uuid} [cliente_id]
 * @property {EstadoPedido} [estado]
 */

/**
 * @typedef {object} FacturaQuery
 * @see RangoFechas (hereda sus propiedades)
 * @property {Uuid} [cliente_id]
 * @property {EstadoFactura} [estado]
 * @property {Uuid} [pedido_id]
 */

export {};
