import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { buildParams } from '../http-params';
import type {
  FormatoExport,
  QueryCartera,
  QueryEmbudo,
  QueryRankingClientes,
  QueryRankingProductos,
  QueryVendedores,
  QueryVentasPeriodo,
  ReporteCartera,
  ReporteEmbudo,
  ReporteRankingClientes,
  ReporteRankingProductos,
  ReporteVendedores,
  ReporteVentasPeriodo,
} from '../models';

/** Rutas de los seis reportes. La exportación reusa la misma que la consulta. */
export const RUTAS_REPORTE = {
  ventasPeriodo: '/reportes/ventas-por-periodo/',
  clientes: '/reportes/clientes/',
  productos: '/reportes/productos/',
  embudo: '/reportes/embudo/',
  cartera: '/reportes/cartera/',
  vendedores: '/reportes/vendedores/',
} as const;

export type RutaReporte = (typeof RUTAS_REPORTE)[keyof typeof RUTAS_REPORTE];

/**
 * Reportes de Ventas (RV-01..06).
 *
 * Consultar y exportar son el mismo endpoint: sin `formato` responde JSON, con
 * `formato=csv|pdf` devuelve el archivo del reporte **completo** (ignorando
 * `limit`) y exige el permiso `ventas:reportes:exportar`. Por eso la
 * exportación va por un método aparte: necesita `responseType: 'blob'`, y un
 * blob y un objeto tipado no caben en la misma firma.
 */
@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/ventas`;

  ventasPorPeriodo(query: QueryVentasPeriodo): Promise<ReporteVentasPeriodo> {
    return this.get<ReporteVentasPeriodo>(RUTAS_REPORTE.ventasPeriodo, query);
  }

  rankingClientes(query: QueryRankingClientes): Promise<ReporteRankingClientes> {
    return this.get<ReporteRankingClientes>(RUTAS_REPORTE.clientes, query);
  }

  rankingProductos(query: QueryRankingProductos): Promise<ReporteRankingProductos> {
    return this.get<ReporteRankingProductos>(RUTAS_REPORTE.productos, query);
  }

  embudo(query: QueryEmbudo): Promise<ReporteEmbudo> {
    return this.get<ReporteEmbudo>(RUTAS_REPORTE.embudo, query);
  }

  cartera(query: QueryCartera): Promise<ReporteCartera> {
    return this.get<ReporteCartera>(RUTAS_REPORTE.cartera, query);
  }

  vendedores(query: QueryVendedores): Promise<ReporteVendedores> {
    return this.get<ReporteVendedores>(RUTAS_REPORTE.vendedores, query);
  }

  /** Devuelve el archivo. Un 403 aquí significa que falta `:exportar`. */
  exportar(ruta: RutaReporte, query: object, formato: FormatoExport): Promise<Blob> {
    return firstValueFrom(
      this.http.get(this.base + ruta, {
        params: buildParams({ ...query, formato }),
        responseType: 'blob',
      }),
    );
  }

  private get<T>(ruta: string, query: object): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.base + ruta, { params: buildParams(query) }));
  }
}

/**
 * Lanza la descarga de un blob ya recibido.
 *
 * El `revokeObjectURL` no es opcional: cada `createObjectURL` retiene el blob
 * entero en memoria hasta que se libera, y en una sesión larga exportando
 * reportes eso se acumula.
 */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
