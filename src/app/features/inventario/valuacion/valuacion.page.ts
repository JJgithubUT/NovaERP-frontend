import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { Big, formatCantidad, formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';

/**
 * Valuación del inventario (RF-64): qué vale lo que hay en almacén.
 *
 * Es la vista hermana de Stock —mismos filtros, mismo endpoint paginado— pero
 * responde a otra pregunta: no *cuánto hay* sino *cuánto vale*. El backend ya
 * devuelve `valor_total` por fila (`cantidad × costo_referencia`), así que aquí
 * no se recalcula: se muestra lo que dice la vista SQL.
 *
 * Sobre el total: `/valuacion/` **pagina y no devuelve un gran total**. La suma
 * de abajo es la de las filas visibles y así está rotulada. Presentarla como
 * "valor total del inventario" sería falso en cuanto haya una segunda página, y
 * es exactamente el tipo de cifra que alguien copiaría a un cierre contable.
 * Mientras el backend no exponga el agregado, la pantalla no lo inventa.
 */
@Component({
  selector: 'app-valuacion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityComboComponent, FilaMensajeComponent, PaginacionComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div>
        <h2 class="text-headline-sm text-on-surface">Valuación de inventario</h2>
        <p class="mt-0.5 text-body-sm text-on-surface-variant">
          Valor = cantidad × costo de referencia del producto.
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
              <th class="num">Costo referencia</th>
              <th class="num">Valor</th>
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
              @for (fila of filas(); track fila.sku + fila.almacen) {
                <tr>
                  <td class="clave">{{ fila.sku }}</td>
                  <td>{{ fila.producto }}</td>
                  <td class="tenue">{{ fila.almacen }}</td>
                  <td class="num tenue">{{ cantidad(fila.cantidad) }}</td>
                  <td class="num tenue">{{ moneda(fila.costo_referencia) }}</td>
                  <td class="num font-bold text-action">{{ moneda(fila.valor_total) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  Sin existencias que valuar.
                </tr>
              }
            }
          </tbody>

          @if (filas().length > 0) {
            <tfoot class="border-t-2 border-outline-variant font-semibold">
              <tr>
                <td colspan="5">
                  Valor de esta página ({{ filas().length }}
                  {{ filas().length === 1 ? 'línea' : 'líneas' }})
                </td>
                <td class="num text-action">{{ moneda(totalPagina()) }}</td>
              </tr>
            </tfoot>
          }
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
export class ValuacionPage {
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
      queryKey: qk.lista(slug, 'valuacion', filtros),
      queryFn: () => this.api.listarValuacion(filtros),
    };
  });

  protected readonly filas = computed(() => this.consulta.data()?.results ?? []);

  /**
   * Suma con Big, no con `+`: son importes en string y sumarlos como números
   * reintroduciría justo el error de precisión que el backend evita mandándolos
   * así. Una fila corrupta no debe tumbar el total, de ahí el try.
   */
  protected readonly totalPagina = computed(() =>
    this.filas()
      .reduce((acumulado, fila) => {
        try {
          return acumulado.plus(toDecimal(fila.valor_total));
        } catch {
          return acumulado;
        }
      }, new Big(0))
      .toString(),
  );

  protected readonly cantidad = formatCantidad;
  protected readonly moneda = formatMoneda;

  /** Cambiar un filtro vuelve a la página 1, igual que en Stock. */
  protected filtrar(destino: WritableSignal<OpcionCombo | null>, valor: OpcionCombo | null): void {
    destino.set(valor);
    this.pagina.set(1);
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar la valuación.');
  }
}
