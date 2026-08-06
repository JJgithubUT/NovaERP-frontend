import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { InventarioApi } from '../../../api/services/inventario.api';
import { PAGE_SIZE_DEFAULT } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { formatCantidad } from '../../../shared/utils/decimal.util';

/**
 * Existencias por producto y almacén (RF-59).
 *
 * Los filtros son combos y no una caja de texto porque `/stock-disponible/`
 * **no acepta `search`**: solo `producto_id` y `almacen_id` (openapi §
 * Inventario). Una caja de búsqueda libre aquí no filtraría nada — el backend
 * ignoraría el parámetro y la tabla seguiría mostrando todo, que es lo que
 * hacía la pantalla original.
 */
@Component({
  selector: 'app-stock-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityComboComponent, FilaMensajeComponent, PaginacionComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div>
        <h2 class="text-headline-sm text-on-surface">Stock y disponibilidad</h2>
        <p class="mt-0.5 text-body-sm text-on-surface-variant">
          Disponible = cantidad − reservado. Lo reservado son pedidos de venta confirmados.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <app-entity-combo
          etiqueta="Filtrar por producto"
          tipo="producto"
          [valor]="producto()"
          (valorChange)="filtrar(producto, $event)"
          marcador="Todos los productos"
        />
        <app-entity-combo
          etiqueta="Filtrar por almacén"
          tipo="almacen"
          [valor]="almacen()"
          (valorChange)="filtrar(almacen, $event)"
          marcador="Todos los almacenes"
        />
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th class="num">Cantidad</th>
              <th class="num">Reservado</th>
              <th class="num">Disponible</th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="6">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="6" tono="error">
                {{
                  error()
                }}
              </tr>
            } @else {
              @for (fila of consulta.data()?.results ?? []; track fila.sku + fila.almacen) {
                <tr>
                  <td class="clave">{{ fila.sku }}</td>
                  <td>{{ fila.producto }}</td>
                  <td class="tenue">{{ fila.almacen }}</td>
                  <td class="num tenue">{{ cantidad(fila.cantidad) }}</td>
                  <td class="num tenue">{{ cantidad(fila.reservado) }}</td>
                  <td class="num font-bold text-action">{{ cantidad(fila.disponible) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  Sin existencias que mostrar.
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
  `,
})
export class StockPage {
  private readonly api = inject(InventarioApi);
  private readonly store = inject(AuthStore);

  protected readonly pagina = signal(1);
  protected readonly producto = signal<OpcionCombo | null>(null);
  protected readonly almacen = signal<OpcionCombo | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      producto_id: this.producto()?.id,
      almacen_id: this.almacen()?.id,
    };

    return {
      queryKey: qk.lista(slug, 'stock', filtros),
      queryFn: () => this.api.listarStock(filtros),
    };
  });

  protected readonly cantidad = formatCantidad;

  /**
   * Cambiar un filtro vuelve a la página 1. Sin esto, filtrar desde la página 3
   * pediría la tercera página de un resultado que quizá solo tiene una, y la
   * tabla saldría vacía como si el filtro no encontrara nada.
   */
  protected filtrar(destino: WritableSignal<OpcionCombo | null>, valor: OpcionCombo | null): void {
    destino.set(valor);
    this.pagina.set(1);
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar el stock.');
  }
}
