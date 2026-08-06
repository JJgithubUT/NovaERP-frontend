import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Agrupacion, QueryVentasPeriodo } from '../../../api/models';
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
 * RV-01 · Facturación agregada por día, semana o mes.
 *
 * La cifra que manda es `venta_neta` (facturado − notas de crédito), no
 * `total_facturado`. Y una nota de crédito se imputa al periodo de **su** fecha,
 * no al de la factura que corrige: así un mes ya reportado no cambia de valor
 * a posteriori.
 */
@Component({
  selector: 'app-ventas-periodo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReporteHeaderComponent, FilaMensajeComponent],
  template: `
    <div class="flex flex-col gap-5">
      <app-reporte-header
        titulo="Ventas por periodo"
        descripcion="Venta neta = facturado menos notas de crédito. Solo se listan periodos con movimiento."
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
          <label class="text-label-caps uppercase text-on-surface-variant" for="agrupar">
            Agrupar por
          </label>
          <select
            id="agrupar"
            class="campo-control"
            [value]="agrupar()"
            (change)="agrupar.set($any($event.target).value)"
          >
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </div>
      </app-reporte-header>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Periodo</th>
              <th class="num">Facturas</th>
              <th class="num">Subtotal</th>
              <th class="num">Impuestos</th>
              <th class="num">Facturado</th>
              <th class="num">Notas crédito</th>
              <th class="num">Venta neta</th>
              <th class="num">Ticket prom.</th>
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
              @for (fila of consulta.data()?.resultados ?? []; track fila.periodo) {
                <tr>
                  <td class="whitespace-nowrap font-medium">{{ fecha(fila.periodo) }}</td>
                  <td class="num tenue">{{ fila.num_facturas }}</td>
                  <td class="num tenue">{{ moneda(fila.subtotal) }}</td>
                  <td class="num tenue">{{ moneda(fila.impuestos) }}</td>
                  <td class="num">{{ moneda(fila.total_facturado) }}</td>
                  <td class="num tenue">{{ moneda(fila.notas_credito) }}</td>
                  <td class="num font-bold text-action">{{ moneda(fila.venta_neta) }}</td>
                  <td class="num tenue">{{ moneda(fila.ticket_promedio) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="8">
                  Sin facturación en el rango elegido.
                </tr>
              }
            }
          </tbody>

          @if (consulta.data(); as reporte) {
            <tfoot class="border-t-2 border-outline-variant font-semibold">
              <tr>
                <td>Total</td>
                <td class="num">{{ reporte.totales.num_facturas }}</td>
                <td class="num">{{ moneda(reporte.totales.subtotal) }}</td>
                <td class="num">{{ moneda(reporte.totales.impuestos) }}</td>
                <td class="num">{{ moneda(reporte.totales.total_facturado) }}</td>
                <td class="num">{{ moneda(reporte.totales.notas_credito) }}</td>
                <td class="num text-action">{{ moneda(reporte.totales.venta_neta) }}</td>
                <td class="num">{{ moneda(reporte.totales.ticket_promedio) }}</td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  `,
})
export class VentasPeriodoPage {
  private readonly api = inject(ReportesApi);
  private readonly store = inject(AuthStore);

  private readonly inicial = rangoPorDefecto();

  protected readonly desde = signal(this.inicial.desde);
  protected readonly hasta = signal(this.inicial.hasta);
  protected readonly agrupar = signal<Agrupacion>('mes');

  /**
   * Filtros ya aplicados, que es lo que consulta la query. Los signals de
   * arriba son el borrador del formulario: sin esta separación, cada tecleo en
   * una fecha dispararía una consulta con un rango a medio escribir.
   */
  protected readonly aplicados = signal<QueryVentasPeriodo>({
    desde: this.inicial.desde,
    hasta: this.inicial.hasta,
    agrupar: 'mes',
  });

  protected readonly consulta = injectQuery(() => {
    const filtros = this.aplicados();
    return {
      queryKey: [...qk.tenant(this.store.tenantSlug() ?? ''), 'rv01', filtros] as const,
      queryFn: () => this.api.ventasPorPeriodo(filtros),
    };
  });

  private readonly exportacion = usarExportacion(RUTAS_REPORTE.ventasPeriodo, 'ventas-por-periodo');
  protected readonly exportando = this.exportacion.exportando;
  protected readonly exportar = this.exportacion.exportar;

  protected readonly moneda = formatMoneda;
  protected readonly fecha = formatFecha;

  protected aplicar(): void {
    this.aplicados.set({
      desde: this.desde(),
      hasta: this.hasta(),
      agrupar: this.agrupar(),
    });
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo generar el reporte.');
  }
}
