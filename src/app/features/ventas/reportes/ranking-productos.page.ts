import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { OrdenProductos, QueryRankingProductos } from '../../../api/models';
import { ReportesApi, RUTAS_REPORTE } from '../../../api/services/reportes.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { ReporteHeaderComponent } from './reporte-header.component';
import { rangoPorDefecto, usarExportacion } from './usar-reporte';

/**
 * RV-03 · Ranking de productos.
 *
 * Ojo con la lectura: es **importe bruto**. Una nota de crédito no tiene
 * desglose por línea, así que las devoluciones no se descuentan de aquí. El
 * backend lo declara en `nota` y la cabecera lo muestra — no es un detalle
 * menor si se compara esta tabla con la venta neta de RV-01.
 */
@Component({
  selector: 'app-ranking-productos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReporteHeaderComponent, FilaMensajeComponent],
  template: `
    <div class="flex flex-col gap-5">
      <app-reporte-header
        titulo="Ranking de productos"
        descripcion="Qué se vende más, por importe o por cantidad."
        [(desde)]="desde"
        [(hasta)]="hasta"
        [cargando]="consulta.isFetching()"
        [exportando]="exportando()"
        [nota]="consulta.data()?.nota"
        [alcanceVendedor]="consulta.data()?.alcance_vendedor ?? null"
        [generadoEn]="consulta.data()?.generado_en"
        (buscar)="aplicar()"
        (exportar)="exportar(aplicados(), $event)"
      >
        <div class="flex flex-col gap-1.5">
          <label class="text-label-caps uppercase text-on-surface-variant" for="orden"
            >Ordenar por</label
          >
          <select
            id="orden"
            class="campo-control"
            [value]="orden()"
            (change)="orden.set($any($event.target).value)"
          >
            <option value="monto">Importe</option>
            <option value="cantidad">Cantidad</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-label-caps uppercase text-on-surface-variant" for="limit">Top</label>
          <input
            id="limit"
            type="number"
            min="1"
            max="100"
            class="campo-control w-24"
            [value]="limite()"
            (change)="limite.set(+$any($event.target).value)"
          />
        </div>
      </app-reporte-header>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Producto</th>
              <th class="num">Cantidad</th>
              <th class="num">Importe</th>
              <th class="num">Participación</th>
              <th class="num">Facturas</th>
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
              @for (fila of consulta.data()?.resultados ?? []; track fila.producto_id) {
                <tr>
                  <td class="tenue">{{ $index + 1 }}</td>
                  <td class="clave">{{ fila.sku }}</td>
                  <td class="font-medium">{{ fila.nombre }}</td>
                  <td class="num">{{ cantidad(fila.cantidad) }}</td>
                  <td class="num font-bold text-action">{{ moneda(fila.importe) }}</td>
                  <td class="num tenue">
                    {{ fila.participacion_pct ? fila.participacion_pct + ' %' : '—' }}
                  </td>
                  <td class="num tenue">{{ fila.num_facturas }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="7">
                  Sin productos facturados en el rango.
                </tr>
              }
            }
          </tbody>

          @if (consulta.data(); as reporte) {
            <tfoot class="border-t-2 border-outline-variant font-semibold">
              <tr>
                <td colspan="3">Total ({{ reporte.totales.num_productos }} productos)</td>
                <td class="num">{{ cantidad(reporte.totales.cantidad) }}</td>
                <td class="num text-action">{{ moneda(reporte.totales.importe) }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  `,
})
export class RankingProductosPage {
  private readonly api = inject(ReportesApi);
  private readonly store = inject(AuthStore);

  private readonly inicial = rangoPorDefecto();

  protected readonly desde = signal(this.inicial.desde);
  protected readonly hasta = signal(this.inicial.hasta);
  protected readonly orden = signal<OrdenProductos>('monto');
  protected readonly limite = signal(10);

  protected readonly aplicados = signal<QueryRankingProductos>({
    desde: this.inicial.desde,
    hasta: this.inicial.hasta,
    orden: 'monto',
    limit: 10,
  });

  protected readonly consulta = injectQuery(() => {
    const filtros = this.aplicados();
    return {
      queryKey: [...qk.tenant(this.store.tenantSlug() ?? ''), 'rv03', filtros] as const,
      queryFn: () => this.api.rankingProductos(filtros),
    };
  });

  private readonly exportacion = usarExportacion(RUTAS_REPORTE.productos, 'ranking-productos');
  protected readonly exportando = this.exportacion.exportando;
  protected readonly exportar = this.exportacion.exportar;

  protected readonly moneda = formatMoneda;
  protected readonly cantidad = formatCantidad;

  protected aplicar(): void {
    this.aplicados.set({
      desde: this.desde(),
      hasta: this.hasta(),
      orden: this.orden(),
      limit: this.limite(),
    });
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo generar el reporte.');
  }
}
