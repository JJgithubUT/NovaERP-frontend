import type { DecimalString, Uuid } from './common.model';

/**
 * Reportes de Ventas RV-01..06.
 *
 * El sobre de un reporte **no es** el sobre paginado de los listados: un
 * agregado no es una página. Solo Cartera tiene paginación, y únicamente en su
 * bloque `detalle`.
 *
 * Los `totales` que documenta el openapi como abiertos (`additionalProperties`)
 * están tipados aquí uno a uno, leídos de `reporte_service.py`. Tenerlos
 * concretos es lo que permite pintar la fila de totales sin adivinar claves.
 */

/** Porcentaje decimal en string. `null` cuando no se puede calcular. */
export type PorcentajeString = string | null;

/** Parte común de RV-01..04 y RV-06. Cartera tiene el suyo (usa corte). */
export interface SobreReporte<TTotales, TResultado> {
  rango: { desde: string; hasta: string };
  /** Eco de los filtros recibidos; `null` los que no se enviaron. */
  filtros: Record<string, string | null>;
  /**
   * A qué vendedor quedó acotado de verdad. `null` = toda la organización.
   * Si viene con valor, quien mira **no** tiene `ventas:pipeline:ver_todo` y
   * está viendo solo lo suyo, pidiera lo que pidiera.
   */
  alcance_vendedor: Uuid | null;
  totales: TTotales;
  resultados: TResultado[];
  /** Advertencia metodológica. Hay que mostrarla: cambia cómo se leen las cifras. */
  nota?: string;
  generado_en: string;
}

/* ------------------------------------------------ RV-01 ventas por periodo */

export type Agrupacion = 'dia' | 'semana' | 'mes';

export interface FilaVentasPeriodo {
  /** Primer día del cubo. */
  periodo: string;
  num_facturas: number;
  subtotal: DecimalString;
  impuestos: DecimalString;
  total_facturado: DecimalString;
  notas_credito: DecimalString;
  /** `total_facturado − notas_credito`. Es la cifra que importa. */
  venta_neta: DecimalString;
  ticket_promedio: DecimalString;
}

export interface TotalesVentasPeriodo {
  num_facturas: number;
  subtotal: DecimalString;
  impuestos: DecimalString;
  total_facturado: DecimalString;
  notas_credito: DecimalString;
  venta_neta: DecimalString;
  ticket_promedio: DecimalString;
}

export interface ReporteVentasPeriodo extends SobreReporte<
  TotalesVentasPeriodo,
  FilaVentasPeriodo
> {
  agrupado_por: Agrupacion;
}

/* --------------------------------------------------- RV-02 ranking clientes */

export type OrdenClientes = 'monto' | 'volumen';

export interface FilaRankingCliente {
  cliente_id: Uuid;
  razon_social: string;
  num_facturas: number;
  total_facturado: DecimalString;
  notas_credito: DecimalString;
  venta_neta: DecimalString;
  participacion_pct: PorcentajeString;
  ultima_compra: string | null;
}

export interface TotalesRankingClientes {
  num_clientes: number;
  num_facturas: number;
  total_facturado: DecimalString;
  notas_credito: DecimalString;
  venta_neta: DecimalString;
}

export interface ReporteRankingClientes extends SobreReporte<
  TotalesRankingClientes,
  FilaRankingCliente
> {
  orden: OrdenClientes;
  limit: number;
}

/* -------------------------------------------------- RV-03 ranking productos */

export type OrdenProductos = 'monto' | 'cantidad';

export interface FilaRankingProducto {
  producto_id: Uuid;
  sku: string;
  nombre: string;
  cantidad: DecimalString;
  importe: DecimalString;
  participacion_pct: PorcentajeString;
  num_facturas: number;
}

export interface TotalesRankingProductos {
  num_productos: number;
  cantidad: DecimalString;
  importe: DecimalString;
}

export interface ReporteRankingProductos extends SobreReporte<
  TotalesRankingProductos,
  FilaRankingProducto
> {
  orden: OrdenProductos;
  limit: number;
}

/* ------------------------------------------------------------ RV-04 embudo */

export type EtapaEmbudo = 'oportunidades' | 'cotizaciones' | 'pedidos' | 'facturas';

export interface FilaEmbudo {
  etapa: EtapaEmbudo;
  conteo: number;
  monto: DecimalString;
  /** Respecto de la etapa anterior. `null` en la primera. */
  conversion_pct: PorcentajeString;
}

export interface MotivoPerdidaEmbudo {
  motivo: string;
  conteo: number;
}

export interface TotalesEmbudo {
  oportunidades_abiertas: number;
  oportunidades_ganadas: number;
  oportunidades_perdidas: number;
  tasa_cierre_ganado_pct: PorcentajeString;
  cotizaciones_aprobadas: number;
  cotizaciones_rechazadas: number;
  cotizaciones_vencidas: number;
  tasa_aprobacion_pct: PorcentajeString;
  pedidos_cancelados: number;
  venta_facturada: DecimalString;
}

export interface ReporteEmbudo extends SobreReporte<TotalesEmbudo, FilaEmbudo> {
  motivos_perdida: MotivoPerdidaEmbudo[];
}

/* ----------------------------------------------------------- RV-05 cartera */

/** Cubos de antigüedad. Cuentan días **desde la emisión**, no días vencidos. */
export interface CubosAntiguedad {
  dias_0_30: DecimalString;
  dias_31_60: DecimalString;
  dias_61_90: DecimalString;
  dias_90_mas: DecimalString;
}

export interface FilaCartera extends CubosAntiguedad {
  cliente_id: Uuid;
  razon_social: string;
  num_facturas: number;
  saldo_total: DecimalString;
}

export interface TotalesCartera extends CubosAntiguedad {
  num_clientes: number;
  num_facturas: number;
  saldo_total: DecimalString;
}

/**
 * Cartera no usa rango sino una fecha de **corte**: es una foto, y el saldo se
 * reconstruye a esa fecha, no se lee el de hoy. Por eso su sobre es distinto.
 */
export interface ReporteCartera {
  corte: string;
  filtros: Record<string, string | null>;
  alcance_vendedor: Uuid | null;
  /** Declara explícitamente que la antigüedad se cuenta desde la emisión. */
  criterio: string;
  totales: TotalesCartera;
  resultados: FilaCartera[];
  generado_en: string;
}

/* -------------------------------------------------------- RV-06 vendedores */

export interface FilaVendedor {
  /** `null` en la fila agregada "Sin asignar". */
  vendedor_id: Uuid | null;
  nombre: string;
  oportunidades_ganadas: number;
  oportunidades_perdidas: number;
  tasa_conversion_pct: PorcentajeString;
  cotizaciones_emitidas: number;
  cotizaciones_aprobadas: number;
  pedidos_confirmados: number;
  num_facturas: number;
  facturado: DecimalString;
  notas_credito: DecimalString;
  venta_neta: DecimalString;
}

export interface TotalesVendedores {
  oportunidades_ganadas: number;
  oportunidades_perdidas: number;
  cotizaciones_emitidas: number;
  cotizaciones_aprobadas: number;
  pedidos_confirmados: number;
  num_facturas: number;
  venta_neta: DecimalString;
  /** No cuenta la fila "Sin asignar". */
  num_vendedores: number;
}

export type ReporteVendedores = SobreReporte<TotalesVendedores, FilaVendedor>;

/* -------------------------------------------------------------- parámetros */

export type FormatoExport = 'csv' | 'pdf';

/** Rango obligatorio en RV-01..04 y RV-06. No puede exceder 366 días. */
export interface RangoReporte {
  desde: string;
  hasta: string;
  vendedor_id?: Uuid;
}

export interface QueryVentasPeriodo extends RangoReporte {
  agrupar?: Agrupacion;
  cliente_id?: Uuid;
}

export interface QueryRankingClientes extends RangoReporte {
  orden?: OrdenClientes;
  limit?: number;
}

export interface QueryRankingProductos extends RangoReporte {
  orden?: OrdenProductos;
  limit?: number;
  cliente_id?: Uuid;
}

export type QueryEmbudo = RangoReporte;

export type QueryVendedores = RangoReporte;

export interface QueryCartera {
  /** Por defecto, hoy. */
  corte?: string;
  cliente_id?: Uuid;
}
