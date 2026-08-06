import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type Producto, type ProductoCreate } from '../../../api/models';
import { InventarioApi } from '../../../api/services/inventario.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { BuscadorComponent } from '../../../shared/ui/buscador/buscador.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { ProductoFormModal } from './producto-form.modal';

/**
 * Catálogo de productos (FLUJO-INVENTARIO §2).
 *
 * Dos reglas del contrato que la pantalla refleja:
 *
 * - **La baja es lógica.** El DELETE no borra: deja `activo: false` y el
 *   producto sigue en la tabla, marcado como inactivo. Su kardex se conserva.
 * - **No hay reactivación.** `editar_producto` en el backend ignora el campo
 *   `activo`, así que no se ofrece un botón "Activar" que no haría nada. Un
 *   producto dado de baja solo se puede reactivar desde la base de datos.
 */
@Component({
  selector: 'app-productos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BuscadorComponent,
    FilaMensajeComponent,
    IconComponent,
    PaginacionComponent,
    ProductoFormModal,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Catálogo de productos</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            El SKU es único por empresa. Costo y precio deben ser mayores o iguales a 0.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nuevo producto
        </button>
      </div>

      <app-buscador marcador="Buscar por SKU o nombre…" (buscar)="buscar($event)" />

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th class="num">Costo ref.</th>
              <th class="num">Precio venta</th>
              <th class="num">Stock mín.</th>
              <th>Estado</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="7">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="7" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (producto of consulta.data()?.results ?? []; track producto.id) {
                <tr>
                  <td class="clave">{{ producto.sku }}</td>
                  <td>{{ producto.nombre }}</td>
                  <td class="num">{{ moneda(producto.costo_referencia) }}</td>
                  <td class="num">{{ moneda(producto.precio_venta) }}</td>
                  <td class="num tenue">{{ cantidad(producto.stock_minimo) }}</td>
                  <td>
                    <app-badge [tono]="producto.activo ? 'exito' : 'neutro'">
                      {{ producto.activo ? 'Activo' : 'Inactivo' }}
                    </app-badge>
                  </td>
                  <td class="text-right">
                    <button type="button" class="btn-fila" (click)="abrirEdicion(producto)">
                      <app-icon name="edit" [size]="14" />
                      Editar
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="7">
                  No hay productos. Registra el primero con «Nuevo producto».
                </tr>
              }
            }
          </tbody>
        </table>

        <app-paginacion
          [page]="pagina()"
          [count]="consulta.data()?.count ?? 0"
          [numPages]="consulta.data()?.num_pages ?? 1"
          (pageChange)="pagina.set($event)"
        />
      </div>
    </div>

    @if (modalAbierto()) {
      <app-producto-form-modal
        [producto]="enEdicion()"
        [enviando]="guardado.isPending() || baja.isPending()"
        [error]="guardado.error() ?? baja.error()"
        (guardar)="guardar($event)"
        (darDeBaja)="darDeBaja($event)"
        (cerrar)="cerrarModal()"
      />
    }
  `,
})
export class ProductosPage {
  private readonly api = inject(InventarioApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Producto | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      search: this.busqueda(),
    };

    return {
      queryKey: qk.lista(slug, 'productos', filtros),
      queryFn: () => this.api.listarProductos(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: ProductoCreate) => {
      const existente = this.enEdicion();
      return existente
        ? this.api.editarProducto(existente.id, datos)
        : this.api.crearProducto(datos);
    },
    onSuccess: () => {
      this.toasts.exito(this.enEdicion() ? 'Producto actualizado.' : 'Producto creado.');
      this.trasEscribir();
    },
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected readonly baja = injectMutation(() => ({
    mutationFn: (producto: Producto) => this.api.darDeBajaProducto(producto.id),
    onSuccess: () => {
      this.toasts.exito('Producto dado de baja.');
      this.trasEscribir();
    },
    onError: (error: unknown) => this.avisarSiEncolado(error),
  }));

  protected readonly moneda = formatMoneda;
  protected readonly cantidad = formatCantidad;

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los productos.');
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.abrir();
  }

  protected abrirEdicion(producto: Producto): void {
    this.enEdicion.set(producto);
    this.abrir();
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: ProductoCreate): void {
    this.guardado.mutate(datos);
  }

  protected darDeBaja(producto: Producto): void {
    this.baja.mutate(producto);
  }

  private abrir(): void {
    // Los errores del intento anterior no deben aparecer en un formulario
    // recién abierto.
    this.guardado.reset();
    this.baja.reset();
    this.modalAbierto.set(true);
  }

  /**
   * Invalida el catálogo entero (todas las páginas y búsquedas), no solo la
   * página visible: un alta cambia el `count` y puede desplazar filas a otras
   * páginas, así que refrescar solo la actual dejaría el resto desfasado.
   */
  private trasEscribir(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'productos') });
    this.cerrarModal();
  }

  /**
   * Sin red, el interceptor guarda la escritura en el outbox y devuelve el
   * error marcado con `queued`. Para el usuario eso es un éxito diferido, no un
   * fallo: se cierra el modal y se avisa, en vez de dejarlo reintentando.
   */
  private avisarSiEncolado(error: unknown): void {
    if (isApiError(error) && error.queued) {
      this.toasts.aviso(error.message);
      this.cerrarModal();
    }
  }
}
