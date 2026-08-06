import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { OrdenClientes, QueryRankingClientes } from '../../../api/models';
import { ReportesApi, RUTAS_REPORTE } from '../../../api/services/reportes.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { ReporteHeaderComponent } from './reporte-header.component';
import { rangoPorDefecto, usarExportacion } from './usar-reporte';

/**
 * RV-02 · Ranking de clientes.
 *
 * `limit` recorta la tabla pero **no** los totales: el pie agrega todos los
 * clientes del rango. Es deliberado — así las participaciones suman 100 % y el
 * total no baila al cambiar el tamaño del top.
 */
@Component({
  selector: 'app-ranking-clientes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReporteHeaderComponent, FilaMensajeComponent],
  template: `
    <div class="flex flex-col gap-5">
      <app-reporte-header
        titulo="Ranking de clientes"
        descripcion="Ordenado por venta neta o por número de facturas."
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
            <option value="monto">Venta neta</option>
            <option value="volumen">Volumen de facturas</option>
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
              <th>Cliente</th>
              <th class="num">Facturas</th>
              <th class="num">Facturado</th>
              <th class="num">Notas crédito</th>
              <th class="num">Venta neta</th>
              <th class="num">Participación</th>
              <th>Última compra</th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="8">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="8" tono="error">
                {{
                  error()
                }}
              </tr>
            } @else {
              @for (fila of consulta.data()?.resultados ?? []; track fila.cliente_id) {
                <tr>
                  <td class="tenue">{{ $index + 1 }}</td>
                  <td class="font-medium">{{ fila.razon_social }}</td>
                  <td class="num tenue">{{ fila.num_facturas }}</td>
                  <td class="num tenue">{{ moneda(fila.total_facturado) }}</td>
                  <td class="num tenue">{{ moneda(fila.notas_credito) }}</td>
                  <td class="num font-bold text-action">{{ moneda(fila.venta_neta) }}</td>
                  <td class="num tenue">
                    {{ fila.participacion_pct ? fila.participacion_pct + ' %' : '—' }}
                  </td>
                  <td class="tenue whitespace-nowrap">{{ fecha(fila.ultima_compra) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="8">
                  Sin ventas en el rango elegido.
                </tr>
              }
            }
          </tbody>

          @if (consulta.data(); as reporte) {
            <tfoot class="border-t-2 border-outline-variant font-semibold">
              <tr>
                <td colspan="2">Total ({{ reporte.totales.num_clientes }} clientes)</td>
                <td class="num">{{ reporte.totales.num_facturas }}</td>
                <td class="num">{{ moneda(reporte.totales.total_facturado) }}</td>
                <td class="num">{{ moneda(reporte.totales.notas_credito) }}</td>
                <td class="num text-action">{{ moneda(reporte.totales.venta_neta) }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  `,
})
export class RankingClientesPage {
  private readonly api = inject(ReportesApi);
  private readonly store = inject(AuthStore);

  private readonly inicial = rangoPorDefecto();

  protected readonly desde = signal(this.inicial.desde);
  protected readonly hasta = signal(this.inicial.hasta);
  protected readonly orden = signal<OrdenClientes>('monto');
  protected readonly limite = signal(10);

  protected readonly aplicados = signal<QueryRankingClientes>({
    desde: this.inicial.desde,
    hasta: this.inicial.hasta,
    orden: 'monto',
    limit: 10,
  });

  protected readonly consulta = injectQuery(() => {
    const filtros = this.aplicados();
    return {
      queryKey: [...qk.tenant(this.store.tenantSlug() ?? ''), 'rv02', filtros] as const,
      queryFn: () => this.api.rankingClientes(filtros),
    };
  });

  private readonly exportacion = usarExportacion(RUTAS_REPORTE.clientes, 'ranking-clientes');
  protected readonly exportando = this.exportacion.exportando;
  protected readonly exportar = this.exportacion.exportar;

  protected readonly moneda = formatMoneda;
  protected readonly fecha = formatFecha;

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
