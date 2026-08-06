import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { buildParams } from '../http-params';
import type {
  BajaResponse,
  CatalogQuery,
  ConfigAprobacion,
  ConfigAprobacionUpdate,
  CuentaPorPagar,
  CuentaPorPagarQuery,
  HistorialProveedor,
  OrdenCompra,
  OrdenCompraCreate,
  OrdenCompraQuery,
  OrdenCompraUpdate,
  Paginated,
  Proveedor,
  ProveedorCreate,
  ProveedorUpdate,
  Recepcion,
  RecepcionCreate,
  RecepcionQuery,
  Uuid,
} from '../models';

/**
 * Cliente HTTP del módulo de Compras.
 *
 * Una asimetría del contrato que conviene tener presente: aprobar una orden no
 * tiene endpoint propio, es un `PATCH` con `estado: 'enviada'`. Cancelar sí lo
 * tiene. No es un descuido del diseño — la aprobación es manual y no dispara
 * efectos, mientras que cancelar cierra la orden a nuevas recepciones.
 */
@Injectable({ providedIn: 'root' })
export class ComprasApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/compras`;

  /* ---------------------------------------------------------- proveedores */

  listarProveedores(query: CatalogQuery = {}): Promise<Paginated<Proveedor>> {
    return this.get<Paginated<Proveedor>>('/proveedores/', query);
  }

  crearProveedor(body: ProveedorCreate): Promise<Proveedor> {
    return firstValueFrom(this.http.post<Proveedor>(`${this.base}/proveedores/`, body));
  }

  editarProveedor(id: Uuid, body: ProveedorUpdate): Promise<Proveedor> {
    return firstValueFrom(this.http.patch<Proveedor>(`${this.base}/proveedores/${id}/`, body));
  }

  /**
   * Baja lógica **incondicional**, a diferencia del cliente: aquí no se
   * comprueba deuda pendiente. Las órdenes y cuentas por pagar del proveedor se
   * conservan intactas.
   */
  darDeBajaProveedor(id: Uuid): Promise<BajaResponse> {
    return firstValueFrom(this.http.delete<BajaResponse>(`${this.base}/proveedores/${id}/`));
  }

  /** RF-51. Ficha completa, sin paginar: órdenes, recepciones y CxP juntas. */
  historialProveedor(id: Uuid): Promise<HistorialProveedor> {
    return firstValueFrom(
      this.http.get<HistorialProveedor>(`${this.base}/proveedores/${id}/historial/`),
    );
  }

  /* --------------------------------------------------------------- órdenes */

  listarOrdenes(query: OrdenCompraQuery = {}): Promise<Paginated<OrdenCompra>> {
    return this.get<Paginated<OrdenCompra>>('/ordenes/', query);
  }

  obtenerOrden(id: Uuid): Promise<OrdenCompra> {
    return firstValueFrom(this.http.get<OrdenCompra>(`${this.base}/ordenes/${id}/`));
  }

  /** Si el total supera el umbral del tenant, nace en `pendiente_aprobacion`. */
  crearOrden(body: OrdenCompraCreate): Promise<OrdenCompra> {
    return firstValueFrom(this.http.post<OrdenCompra>(`${this.base}/ordenes/`, body));
  }

  editarOrden(id: Uuid, body: OrdenCompraUpdate): Promise<OrdenCompra> {
    return firstValueFrom(this.http.patch<OrdenCompra>(`${this.base}/ordenes/${id}/`, body));
  }

  /** Aprobación manual: el mismo PATCH, moviendo el estado a `enviada`. */
  aprobarOrden(id: Uuid): Promise<OrdenCompra> {
    return this.editarOrden(id, { estado: 'enviada' });
  }

  /** Cierra la orden a nuevas recepciones. Lo ya recibido queda intacto. */
  cancelarOrden(id: Uuid): Promise<OrdenCompra> {
    return firstValueFrom(this.http.post<OrdenCompra>(`${this.base}/ordenes/${id}/cancelar/`, {}));
  }

  /* ----------------------------------------------------------- recepciones */

  listarRecepciones(query: RecepcionQuery = {}): Promise<Paginated<Recepcion>> {
    return this.get<Paginated<Recepcion>>('/recepciones/', query);
  }

  /**
   * El paso que mueve todo: suma stock y crea la cuenta por pagar. Su efecto
   * sobre el inventario es irreversible.
   */
  crearRecepcion(body: RecepcionCreate): Promise<Recepcion> {
    return firstValueFrom(this.http.post<Recepcion>(`${this.base}/recepciones/`, body));
  }

  /* ------------------------------------------------------ cuentas por pagar */

  listarCuentasPorPagar(query: CuentaPorPagarQuery = {}): Promise<Paginated<CuentaPorPagar>> {
    return this.get<Paginated<CuentaPorPagar>>('/cuentas-por-pagar/', query);
  }

  /* ------------------------------------------------------------ config */

  obtenerConfigAprobacion(): Promise<ConfigAprobacion> {
    return firstValueFrom(this.http.get<ConfigAprobacion>(`${this.base}/config-aprobacion/`));
  }

  editarConfigAprobacion(body: ConfigAprobacionUpdate): Promise<ConfigAprobacion> {
    return firstValueFrom(
      this.http.patch<ConfigAprobacion>(`${this.base}/config-aprobacion/`, body),
    );
  }

  private get<T>(ruta: string, query: object): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.base + ruta, { params: buildParams(query) }));
  }
}
