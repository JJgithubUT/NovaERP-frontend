import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type TipoMovimiento } from '../../../api/models';
import { InventarioApi } from '../../../api/services/inventario.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_LABEL, tonoDeTipo } from '../inventario.labels';

/**
 * Kardex: la bitácora de todo lo que ha alterado el stock (RF-62).
 *
 * Es **append-only**. No hay editar ni borrar, y no es un descuido: es la
 * fuente de verdad del inventario (FLUJO-INVENTARIO §1). Corregir un error se
 * hace registrando un ajuste que lo compense, nunca reescribiendo la historia.
 *
 * El filtro de almacén es por **nombre exacto**, no por búsqueda parcial: la
 * vista SQL expone el nombre como clave y el backend compara por igualdad.
 */
@Component({
  selector: 'app-kardex-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, FilaMensajeComponent, PaginacionComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div
        class="flex items-start gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant"
      >
        <span>
          <strong class="font-semibold text-on-surface">Bitácora inmutable:</strong>
          cada entrada, salida, ajuste y transferencia queda aquí y no se edita ni se borra.
        </span>
      </div>

      <div>
        <h2 class="text-headline-sm text-on-surface">Kardex de movimientos</h2>
        <p class="mt-0.5 text-body-sm text-on-surface-variant">
          Historial completo de lo que ha movido la existencia.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <input
          class="campo-control sm:w-40"
          placeholder="SKU"
          aria-label="Filtrar por SKU"
          [value]="sku()"
          (change)="filtrarSku($event)"
        />
        <input
          class="campo-control sm:w-52"
          placeholder="Nombre exacto del almacén"
          aria-label="Filtrar por almacén"
          [value]="almacen()"
          (change)="filtrarAlmacen($event)"
        />
        <select
          class="campo-control sm:w-56"
          aria-label="Filtrar por tipo"
          [value]="tipo()"
          (change)="filtrarTipo($event)"
        >
          <option value="">Todos los tipos</option>
          @for (valor of tipos; track valor) {
            <option [value]="valor">{{ etiquetaTipo(valor) }}</option>
          }
        </select>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>SKU</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th class="num">Cantidad</th>
              <th class="num">Costo unit.</th>
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
                  error()
                }}
              </tr>
            } @else {
              @for (fila of consulta.data()?.results ?? []; track fila.movimiento_id) {
                <tr>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(fila.ocurrido_en) }}
                  </td>
                  <td>
                    <app-badge [tono]="tono(fila.tipo)">{{ etiquetaTipo(fila.tipo) }}</app-badge>
                  </td>
                  <td class="clave">{{ fila.sku }}</td>
                  <td>{{ fila.producto }}</td>
                  <td class="tenue">{{ fila.almacen }}</td>
                  <td class="num font-semibold">{{ cantidad(fila.cantidad) }}</td>
                  <td class="num tenue">
                    {{ fila.costo_unitario ? moneda(fila.costo_unitario) : '—' }}
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="7">
                  Sin movimientos que mostrar.
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
export class KardexPage {
  private readonly api = inject(InventarioApi);
  private readonly store = inject(AuthStore);

  protected readonly pagina = signal(1);
  protected readonly sku = signal('');
  protected readonly almacen = signal('');
  protected readonly tipo = signal<TipoMovimiento | ''>('');

  protected readonly tipos = TIPOS_MOVIMIENTO;

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      sku: this.sku(),
      almacen: this.almacen(),
      tipo: this.tipo() || undefined,
    };

    return {
      queryKey: qk.lista(slug, 'kardex', filtros),
      queryFn: () => this.api.listarKardex(filtros),
    };
  });

  protected readonly cantidad = formatCantidad;
  protected readonly moneda = formatMoneda;
  protected readonly fechaHora = formatFechaHora;
  protected readonly tono = tonoDeTipo;

  protected etiquetaTipo(tipo: TipoMovimiento): string {
    return TIPO_MOVIMIENTO_LABEL[tipo];
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar el kardex.');
  }

  protected filtrarSku(evento: Event): void {
    this.sku.set((evento.target as HTMLInputElement).value.trim());
    this.pagina.set(1);
  }

  protected filtrarAlmacen(evento: Event): void {
    this.almacen.set((evento.target as HTMLInputElement).value.trim());
    this.pagina.set(1);
  }

  protected filtrarTipo(evento: Event): void {
    this.tipo.set((evento.target as HTMLSelectElement).value as TipoMovimiento | '');
    this.pagina.set(1);
  }
}
