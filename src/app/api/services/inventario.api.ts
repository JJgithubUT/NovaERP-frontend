import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { buildParams } from '../http-params';
import type {
  AjusteCreate,
  AjusteInventario,
  AjusteQuery,
  AlertaQuery,
  AlertaStockMinimo,
  Almacen,
  AlmacenCreate,
  AlmacenUpdate,
  BajaResponse,
  CatalogQuery,
  FilaKardex,
  FilaValuacion,
  KardexQuery,
  Movimiento,
  MovimientoCreate,
  Paginated,
  Producto,
  ProductoCreate,
  ProductoUpdate,
  StockDisponible,
  StockQuery,
  Transferencia,
  TransferenciaCreate,
  TransferenciaQuery,
  Uuid,
} from '../models';

/**
 * Cliente HTTP del módulo de Inventario.
 *
 * Solo habla HTTP: no cachea, no guarda estado y no decide cuándo pedir. De eso
 * se encargan las pantallas con TanStack Query, que es quien sabe qué clave
 * invalidar tras cada mutación.
 *
 * El `Authorization` lo pone `authInterceptor`; los errores los normaliza
 * `errorInterceptor` a `ApiError`. Aquí no se toca ninguno de los dos.
 */
@Injectable({ providedIn: 'root' })
export class InventarioApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/inventario`;

  /* ------------------------------------------------------------ productos */

  listarProductos(query: CatalogQuery = {}): Promise<Paginated<Producto>> {
    return this.get<Paginated<Producto>>('/productos/', query);
  }

  crearProducto(body: ProductoCreate): Promise<Producto> {
    return firstValueFrom(this.http.post<Producto>(`${this.base}/productos/`, body));
  }

  editarProducto(id: Uuid, body: ProductoUpdate): Promise<Producto> {
    return firstValueFrom(this.http.patch<Producto>(`${this.base}/productos/${id}/`, body));
  }

  /** Baja lógica: el producto queda `activo: false`, el kardex se conserva. */
  darDeBajaProducto(id: Uuid): Promise<BajaResponse> {
    return firstValueFrom(this.http.delete<BajaResponse>(`${this.base}/productos/${id}/`));
  }

  /* ------------------------------------------------------------ almacenes */

  listarAlmacenes(query: CatalogQuery = {}): Promise<Paginated<Almacen>> {
    return this.get<Paginated<Almacen>>('/almacenes/', query);
  }

  crearAlmacen(body: AlmacenCreate): Promise<Almacen> {
    return firstValueFrom(this.http.post<Almacen>(`${this.base}/almacenes/`, body));
  }

  editarAlmacen(id: Uuid, body: AlmacenUpdate): Promise<Almacen> {
    return firstValueFrom(this.http.patch<Almacen>(`${this.base}/almacenes/${id}/`, body));
  }

  darDeBajaAlmacen(id: Uuid): Promise<BajaResponse> {
    return firstValueFrom(this.http.delete<BajaResponse>(`${this.base}/almacenes/${id}/`));
  }

  /* --------------------------------------------------------- movimientos */

  /**
   * Entrada o salida manual. Una salida que dejaría el stock negativo se
   * rechaza con 422 y el mensaje llega como `ApiError.message`.
   */
  crearMovimiento(body: MovimientoCreate): Promise<Movimiento> {
    return firstValueFrom(this.http.post<Movimiento>(`${this.base}/movimientos/`, body));
  }

  listarMovimientos(query: KardexQuery = {}): Promise<Paginated<Movimiento>> {
    return this.get<Paginated<Movimiento>>('/movimientos/', query);
  }

  /* --------------------------------------------------------------- ajustes */

  listarAjustes(query: AjusteQuery = {}): Promise<Paginated<AjusteInventario>> {
    return this.get<Paginated<AjusteInventario>>('/ajustes/', query);
  }

  crearAjuste(body: AjusteCreate): Promise<AjusteInventario> {
    return firstValueFrom(this.http.post<AjusteInventario>(`${this.base}/ajustes/`, body));
  }

  /* -------------------------------------------------------- transferencias */

  listarTransferencias(query: TransferenciaQuery = {}): Promise<Paginated<Transferencia>> {
    return this.get<Paginated<Transferencia>>('/transferencias/', query);
  }

  /** Salida + entrada atómicas: o se aplican las dos o ninguna. */
  crearTransferencia(body: TransferenciaCreate): Promise<Transferencia> {
    return firstValueFrom(this.http.post<Transferencia>(`${this.base}/transferencias/`, body));
  }

  /* -------------------------------------------------------------- consultas */

  listarStock(query: StockQuery = {}): Promise<Paginated<StockDisponible>> {
    return this.get<Paginated<StockDisponible>>('/stock-disponible/', query);
  }

  listarKardex(query: KardexQuery = {}): Promise<Paginated<FilaKardex>> {
    return this.get<Paginated<FilaKardex>>('/kardex/', query);
  }

  listarValuacion(query: StockQuery = {}): Promise<Paginated<FilaValuacion>> {
    return this.get<Paginated<FilaValuacion>>('/valuacion/', query);
  }

  /* ---------------------------------------------------------------- alertas */

  listarAlertas(query: AlertaQuery = {}): Promise<Paginated<AlertaStockMinimo>> {
    return this.get<Paginated<AlertaStockMinimo>>('/alertas-stock-minimo/', query);
  }

  /** El id es entero, no UUID: esta tabla usa secuencial. */
  notificarAlerta(id: number): Promise<AlertaStockMinimo> {
    return firstValueFrom(
      this.http.post<AlertaStockMinimo>(`${this.base}/alertas-stock-minimo/${id}/notificar/`, {}),
    );
  }

  private get<T>(path: string, query: object): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.base + path, { params: buildParams(query) }));
  }
}
