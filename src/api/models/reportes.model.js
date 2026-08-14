/** @typedef {import('./common.model.js').DecimalString} DecimalString */
/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * Porcentaje decimal en string. `null` cuando no se puede calcular.
 *
 * @typedef {string | null} PorcentajeString
 */

/**
 * Parte común de RV-01..04 y RV-06. Cartera tiene el suyo (usa corte).
 *
 * @template TTotales
 * @template TResultado
 * @typedef {object} SobreReporte
 * @property {{ desde: string; hasta: string }} rango
 * @property {Record<string, string | null>} filtros Eco de los filtros recibidos; `null` los que no se enviaron.
 * @property {Uuid | null} alcance_vendedor A qué vendedor quedó acotado de verdad. `null` = toda la organización. Si viene con valor, quien mira **no** tiene `ventas:pipeline:ver_todo` y está viendo solo lo suyo, pidiera lo que pidiera.
 * @property {TTotales} totales
 * @property {TResultado[]} resultados
 * @property {string} [nota] Advertencia metodológica. Hay que mostrarla: cambia cómo se leen las cifras.
 * @property {string} generado_en
 */

/**
 * @typedef {'dia' | 'semana' | 'mes'} Agrupacion
 */

/**
 * @typedef {object} FilaVentasPeriodo
 * @property {string} periodo Primer día del cubo.
 * @property {number} num_facturas
 * @property {DecimalString} subtotal
 * @property {DecimalString} impuestos
 * @property {DecimalString} total_facturado
 * @property {DecimalString} notas_credito
 * @property {DecimalString} venta_neta `total_facturado − notas_credito`. Es la cifra que importa.
 * @property {DecimalString} ticket_promedio
 */

/**
 * @typedef {object} TotalesVentasPeriodo
 * @property {number} num_facturas
 * @property {DecimalString} subtotal
 * @property {DecimalString} impuestos
 * @property {DecimalString} total_facturado
 * @property {DecimalString} notas_credito
 * @property {DecimalString} venta_neta
 * @property {DecimalString} ticket_promedio
 */

/**
 * @typedef {object} ReporteVentasPeriodo
 * @see SobreReporte<
 *   TotalesVentasPeriodo,
 *   FilaVentasPeriodo
 * > (hereda sus propiedades)
 * @property {Agrupacion} agrupado_por
 */

/**
 * @typedef {'monto' | 'volumen'} OrdenClientes
 */

/**
 * @typedef {object} FilaRankingCliente
 * @property {Uuid} cliente_id
 * @property {string} razon_social
 * @property {number} num_facturas
 * @property {DecimalString} total_facturado
 * @property {DecimalString} notas_credito
 * @property {DecimalString} venta_neta
 * @property {PorcentajeString} participacion_pct
 * @property {string | null} ultima_compra
 */

/**
 * @typedef {object} TotalesRankingClientes
 * @property {number} num_clientes
 * @property {number} num_facturas
 * @property {DecimalString} total_facturado
 * @property {DecimalString} notas_credito
 * @property {DecimalString} venta_neta
 */

/**
 * @typedef {object} ReporteRankingClientes
 * @see SobreReporte<
 *   TotalesRankingClientes,
 *   FilaRankingCliente
 * > (hereda sus propiedades)
 * @property {OrdenClientes} orden
 * @property {number} limit
 */

/**
 * @typedef {'monto' | 'cantidad'} OrdenProductos
 */

/**
 * @typedef {object} FilaRankingProducto
 * @property {Uuid} producto_id
 * @property {string} sku
 * @property {string} nombre
 * @property {DecimalString} cantidad
 * @property {DecimalString} importe
 * @property {PorcentajeString} participacion_pct
 * @property {number} num_facturas
 */

/**
 * @typedef {object} TotalesRankingProductos
 * @property {number} num_productos
 * @property {DecimalString} cantidad
 * @property {DecimalString} importe
 */

/**
 * @typedef {object} ReporteRankingProductos
 * @see SobreReporte<
 *   TotalesRankingProductos,
 *   FilaRankingProducto
 * > (hereda sus propiedades)
 * @property {OrdenProductos} orden
 * @property {number} limit
 */

/**
 * @typedef {'oportunidades' | 'cotizaciones' | 'pedidos' | 'facturas'} EtapaEmbudo
 */

/**
 * @typedef {object} FilaEmbudo
 * @property {EtapaEmbudo} etapa
 * @property {number} conteo
 * @property {DecimalString} monto
 * @property {PorcentajeString} conversion_pct Respecto de la etapa anterior. `null` en la primera.
 */

/**
 * @typedef {object} MotivoPerdidaEmbudo
 * @property {string} motivo
 * @property {number} conteo
 */

/**
 * @typedef {object} TotalesEmbudo
 * @property {number} oportunidades_abiertas
 * @property {number} oportunidades_ganadas
 * @property {number} oportunidades_perdidas
 * @property {PorcentajeString} tasa_cierre_ganado_pct
 * @property {number} cotizaciones_aprobadas
 * @property {number} cotizaciones_rechazadas
 * @property {number} cotizaciones_vencidas
 * @property {PorcentajeString} tasa_aprobacion_pct
 * @property {number} pedidos_cancelados
 * @property {DecimalString} venta_facturada
 */

/**
 * @typedef {object} ReporteEmbudo
 * @see SobreReporte<TotalesEmbudo, FilaEmbudo> (hereda sus propiedades)
 * @property {MotivoPerdidaEmbudo[]} motivos_perdida
 */

/**
 * Cubos de antigüedad. Cuentan días **desde la emisión**, no días vencidos.
 *
 * @typedef {object} CubosAntiguedad
 * @property {DecimalString} dias_0_30
 * @property {DecimalString} dias_31_60
 * @property {DecimalString} dias_61_90
 * @property {DecimalString} dias_90_mas
 */

/**
 * @typedef {object} FilaCartera
 * @see CubosAntiguedad (hereda sus propiedades)
 * @property {Uuid} cliente_id
 * @property {string} razon_social
 * @property {number} num_facturas
 * @property {DecimalString} saldo_total
 */

/**
 * @typedef {object} TotalesCartera
 * @see CubosAntiguedad (hereda sus propiedades)
 * @property {number} num_clientes
 * @property {number} num_facturas
 * @property {DecimalString} saldo_total
 */

/**
 * Cartera no usa rango sino una fecha de **corte**: es una foto, y el saldo se
 * reconstruye a esa fecha, no se lee el de hoy. Por eso su sobre es distinto.
 *
 * @typedef {object} ReporteCartera
 * @property {string} corte
 * @property {Record<string, string | null>} filtros
 * @property {Uuid | null} alcance_vendedor
 * @property {string} criterio Declara explícitamente que la antigüedad se cuenta desde la emisión.
 * @property {TotalesCartera} totales
 * @property {FilaCartera[]} resultados
 * @property {string} generado_en
 */

/**
 * @typedef {object} FilaVendedor
 * @property {Uuid | null} vendedor_id `null` en la fila agregada "Sin asignar".
 * @property {string} nombre
 * @property {number} oportunidades_ganadas
 * @property {number} oportunidades_perdidas
 * @property {PorcentajeString} tasa_conversion_pct
 * @property {number} cotizaciones_emitidas
 * @property {number} cotizaciones_aprobadas
 * @property {number} pedidos_confirmados
 * @property {number} num_facturas
 * @property {DecimalString} facturado
 * @property {DecimalString} notas_credito
 * @property {DecimalString} venta_neta
 */

/**
 * @typedef {object} TotalesVendedores
 * @property {number} oportunidades_ganadas
 * @property {number} oportunidades_perdidas
 * @property {number} cotizaciones_emitidas
 * @property {number} cotizaciones_aprobadas
 * @property {number} pedidos_confirmados
 * @property {number} num_facturas
 * @property {DecimalString} venta_neta
 * @property {number} num_vendedores No cuenta la fila "Sin asignar".
 */

/**
 * @typedef {SobreReporte<TotalesVendedores, FilaVendedor>} ReporteVendedores
 */

/**
 * @typedef {'csv' | 'pdf'} FormatoExport
 */

/**
 * Rango obligatorio en RV-01..04 y RV-06. No puede exceder 366 días.
 *
 * @typedef {object} RangoReporte
 * @property {string} desde
 * @property {string} hasta
 * @property {Uuid} [vendedor_id]
 */

/**
 * @typedef {object} QueryVentasPeriodo
 * @see RangoReporte (hereda sus propiedades)
 * @property {Agrupacion} [agrupar]
 * @property {Uuid} [cliente_id]
 */

/**
 * @typedef {object} QueryRankingClientes
 * @see RangoReporte (hereda sus propiedades)
 * @property {OrdenClientes} [orden]
 * @property {number} [limit]
 */

/**
 * @typedef {object} QueryRankingProductos
 * @see RangoReporte (hereda sus propiedades)
 * @property {OrdenProductos} [orden]
 * @property {number} [limit]
 * @property {Uuid} [cliente_id]
 */

/**
 * @typedef {RangoReporte} QueryEmbudo
 */

/**
 * @typedef {RangoReporte} QueryVendedores
 */

/**
 * @typedef {object} QueryCartera
 * @property {string} [corte] Por defecto, hoy.
 * @property {Uuid} [cliente_id]
 */

export {};
