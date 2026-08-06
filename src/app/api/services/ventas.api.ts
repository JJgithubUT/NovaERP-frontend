import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { buildParams } from '../http-params';
import type {
  BajaResponse,
  CatalogQuery,
  CierreOportunidad,
  Cliente,
  ClienteCreate,
  ClienteUpdate,
  ConfirmarPedido,
  Cotizacion,
  CotizacionCreate,
  CotizacionQuery,
  CotizacionUpdate,
  EtapaOportunidad,
  Factura,
  FacturaCreate,
  FacturaQuery,
  NotaCreditoCreate,
  Oportunidad,
  OportunidadCreate,
  OportunidadQuery,
  OportunidadUpdate,
  Paginated,
  Pedido,
  PedidoCreate,
  PedidoQuery,
  PedidoUpdate,
  Pipeline,
  ResolverCotizacion,
  Uuid,
} from '../models';

/**
 * Cliente HTTP del módulo de Ventas.
 *
 * Igual que `InventarioApi`: solo habla HTTP. Las transiciones de estado
 * (confirmar, resolver, cerrar) son endpoints `POST` con sufijo propio, no
 * `PATCH` sobre el campo `estado` — el backend no deja mover un pedido a
 * `confirmado` escribiéndolo directamente, porque cada transición dispara
 * efectos (reservar stock, validar crédito, crear la CxC).
 */
@Injectable({ providedIn: 'root' })
export class VentasApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/ventas`;

  /* ------------------------------------------------------------- clientes */

  listarClientes(query: CatalogQuery = {}): Promise<Paginated<Cliente>> {
    return this.get<Paginated<Cliente>>('/clientes/', query);
  }

  crearCliente(body: ClienteCreate): Promise<Cliente> {
    return firstValueFrom(this.http.post<Cliente>(`${this.base}/clientes/`, body));
  }

  editarCliente(id: Uuid, body: ClienteUpdate): Promise<Cliente> {
    return firstValueFrom(this.http.patch<Cliente>(`${this.base}/clientes/${id}/`, body));
  }

  /** Se bloquea con 422 si el cliente tiene saldo pendiente en CxC. */
  darDeBajaCliente(id: Uuid): Promise<BajaResponse> {
    return firstValueFrom(this.http.delete<BajaResponse>(`${this.base}/clientes/${id}/`));
  }

  /* -------------------------------------------------------- oportunidades */

  listarOportunidades(query: OportunidadQuery = {}): Promise<Paginated<Oportunidad>> {
    return this.get<Paginated<Oportunidad>>('/oportunidades/', query);
  }

  /** Agregado por etapa para el kanban. No devuelve las oportunidades. */
  obtenerPipeline(): Promise<Pipeline> {
    return firstValueFrom(this.http.get<Pipeline>(`${this.base}/oportunidades/pipeline/`));
  }

  crearOportunidad(body: OportunidadCreate): Promise<Oportunidad> {
    return firstValueFrom(this.http.post<Oportunidad>(`${this.base}/oportunidades/`, body));
  }

  editarOportunidad(id: Uuid, body: OportunidadUpdate): Promise<Oportunidad> {
    return firstValueFrom(this.http.patch<Oportunidad>(`${this.base}/oportunidades/${id}/`, body));
  }

  /** Solo a la etapa siguiente; saltar o retroceder da 422. */
  avanzarEtapa(id: Uuid, etapa: EtapaOportunidad): Promise<Oportunidad> {
    return firstValueFrom(
      this.http.post<Oportunidad>(`${this.base}/oportunidades/${id}/etapa/`, { etapa }),
    );
  }

  /** Terminal: una vez cerrada no se reabre. */
  cerrarOportunidad(id: Uuid, body: CierreOportunidad): Promise<Oportunidad> {
    return firstValueFrom(
      this.http.post<Oportunidad>(`${this.base}/oportunidades/${id}/cerrar/`, body),
    );
  }

  /* --------------------------------------------------------- cotizaciones */

  listarCotizaciones(query: CotizacionQuery = {}): Promise<Paginated<Cotizacion>> {
    return this.get<Paginated<Cotizacion>>('/cotizaciones/', query);
  }

  obtenerCotizacion(id: Uuid): Promise<Cotizacion> {
    return firstValueFrom(this.http.get<Cotizacion>(`${this.base}/cotizaciones/${id}/`));
  }

  /** Un `precio_unitario` manual exige `ventas:cotizaciones:ajustar_precio` (403). */
  crearCotizacion(body: CotizacionCreate): Promise<Cotizacion> {
    return firstValueFrom(this.http.post<Cotizacion>(`${this.base}/cotizaciones/`, body));
  }

  editarCotizacion(id: Uuid, body: CotizacionUpdate): Promise<Cotizacion> {
    return firstValueFrom(this.http.patch<Cotizacion>(`${this.base}/cotizaciones/${id}/`, body));
  }

  /** Aprobar una vencida da 422. */
  resolverCotizacion(id: Uuid, body: ResolverCotizacion): Promise<Cotizacion> {
    return firstValueFrom(
      this.http.post<Cotizacion>(`${this.base}/cotizaciones/${id}/resolver/`, body),
    );
  }

  /* -------------------------------------------------------------- pedidos */

  listarPedidos(query: PedidoQuery = {}): Promise<Paginated<Pedido>> {
    return this.get<Paginated<Pedido>>('/pedidos/', query);
  }

  obtenerPedido(id: Uuid): Promise<Pedido> {
    return firstValueFrom(this.http.get<Pedido>(`${this.base}/pedidos/${id}/`));
  }

  crearPedido(body: PedidoCreate): Promise<Pedido> {
    return firstValueFrom(this.http.post<Pedido>(`${this.base}/pedidos/`, body));
  }

  editarPedido(id: Uuid, body: PedidoUpdate): Promise<Pedido> {
    return firstValueFrom(this.http.patch<Pedido>(`${this.base}/pedidos/${id}/`, body));
  }

  /**
   * El paso que de verdad compromete inventario y crédito: reserva stock y
   * valida el límite del cliente. Puede acabar en `confirmado` o, con
   * backorder habilitado, en `pendiente_surtido`.
   */
  confirmarPedido(id: Uuid, body: ConfirmarPedido): Promise<Pedido> {
    return firstValueFrom(this.http.post<Pedido>(`${this.base}/pedidos/${id}/confirmar/`, body));
  }

  /** Libera el stock reservado. Con facturas emitidas da 422. */
  cancelarPedido(id: Uuid): Promise<Pedido> {
    return firstValueFrom(this.http.post<Pedido>(`${this.base}/pedidos/${id}/cancelar/`, {}));
  }

  /* ------------------------------------------------------------- facturas */

  listarFacturas(query: FacturaQuery = {}): Promise<Paginated<Factura>> {
    return this.get<Paginated<Factura>>('/facturas/', query);
  }

  obtenerFactura(id: Uuid): Promise<Factura> {
    return firstValueFrom(this.http.get<Factura>(`${this.base}/facturas/${id}/`));
  }

  /** Convierte la reserva en salida definitiva y crea la cuenta por cobrar. */
  crearFactura(body: FacturaCreate): Promise<Factura> {
    return firstValueFrom(this.http.post<Factura>(`${this.base}/facturas/`, body));
  }

  /** Única corrección posible: una factura emitida no se edita ni se borra. */
  emitirNotaCredito(id: Uuid, body: NotaCreditoCreate): Promise<Factura> {
    return firstValueFrom(
      this.http.post<Factura>(`${this.base}/facturas/${id}/nota-credito/`, body),
    );
  }

  private get<T>(path: string, query: object): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.base + path, { params: buildParams(query) }));
  }
}
