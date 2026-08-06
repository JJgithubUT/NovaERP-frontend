import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { FilaVendedor, QueryVendedores } from '../../../api/models';
import { ReportesApi, RUTAS_REPORTE } from '../../../api/services/reportes.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { ReporteHeaderComponent } from './reporte-header.component';
import { rangoPorDefecto, usarExportacion } from './usar-reporte';

/**
 * RV-06 · Desempeño comercial por vendedor.
 *
 * La fila «Sin asignar» (`vendedor_id: null`) agrupa los documentos anteriores
 * a que existiera la columna `vendedor_id`. Nunca se reparten entre los
 * vendedores reales ni cuentan en `num_vendedores`, así que se marca aparte:
 * confundirla con una persona inflaría el ranking con cifras de nadie.
 */
@Component({
  selector: 'app-vendedores-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReporteHeaderComponent, FilaMensajeComponent],
  template: `
    <div class="flex flex-col gap-5">
      <app-reporte-header
        titulo="Desempeño por vendedor"
        descripcion="Actividad comercial y venta neta de cada vendedor, ordenadas de mayor a menor."
        [(desde)]="desde"
        [(hasta)]="hasta"
        [cargando]="consulta.isFetching()"
        [exportando]="exportando()"
        [nota]="consulta.data()?.nota"
        [alcanceVendedor]="consulta.data()?.alcance_vendedor ?? null"
        [generadoEn]="consulta.data()?.generado_en"
        (buscar)="aplicar()"
        (exportar)="exportar(aplicados(), $event)"
      />

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Vendedor</th>
              <th class="num">Op. ganadas</th>
              <th class="num">Op. perdidas</th>
              <th class="num">Conversión</th>
              <th class="num">Cot. emitidas</th>
              <th class="num">Cot. aprobadas</th>
              <th class="num">Pedidos conf.</th>
              <th class="num">Facturas</th>
              <th class="num">Facturado</th>
              <th class="num">Venta neta</th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="10">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="10" tono="error">
                {{
                  error()
                }}
              </tr>
            } @else {
              @for (fila of consulta.data()?.resultados ?? []; track fila.nombre) {
                <tr>
                  <td [class.tenue]="sinAsignar(fila)">
                    <span [class.font-medium]="!sinAsignar(fila)">{{ fila.nombre }}</span>
                    @if (sinAsignar(fila)) {
                      <span class="ml-1 text-label-md">· sin atribución</span>
                    }
                  </td>
                  <td class="num tenue">{{ fila.oportunidades_ganadas }}</td>
                  <td class="num tenue">{{ fila.oportunidades_perdidas }}</td>
                  <td class="num">
                    {{ fila.tasa_conversion_pct ? fila.tasa_conversion_pct + ' %' : '—' }}
                  </td>
                  <td class="num tenue">{{ fila.cotizaciones_emitidas }}</td>
                  <td class="num tenue">{{ fila.cotizaciones_aprobadas }}</td>
                  <td class="num tenue">{{ fila.pedidos_confirmados }}</td>
                  <td class="num tenue">{{ fila.num_facturas }}</td>
                  <td class="num">{{ moneda(fila.facturado) }}</td>
                  <td class="num font-bold text-action">{{ moneda(fila.venta_neta) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="10">
                  Sin actividad comercial en el rango.
                </tr>
              }
            }
          </tbody>

          @if (consulta.data(); as reporte) {
            <tfoot class="border-t-2 border-outline-variant font-semibold">
              <tr>
                <td>Total ({{ reporte.totales.num_vendedores }} vendedores)</td>
                <td class="num">{{ reporte.totales.oportunidades_ganadas }}</td>
                <td class="num">{{ reporte.totales.oportunidades_perdidas }}</td>
                <td></td>
                <td class="num">{{ reporte.totales.cotizaciones_emitidas }}</td>
                <td class="num">{{ reporte.totales.cotizaciones_aprobadas }}</td>
                <td class="num">{{ reporte.totales.pedidos_confirmados }}</td>
                <td class="num">{{ reporte.totales.num_facturas }}</td>
                <td></td>
                <td class="num text-action">{{ moneda(reporte.totales.venta_neta) }}</td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  `,
})
export class VendedoresPage {
  private readonly api = inject(ReportesApi);
  private readonly store = inject(AuthStore);

  private readonly inicial = rangoPorDefecto();

  protected readonly desde = signal(this.inicial.desde);
  protected readonly hasta = signal(this.inicial.hasta);

  protected readonly aplicados = signal<QueryVendedores>({
    desde: this.inicial.desde,
    hasta: this.inicial.hasta,
  });

  protected readonly consulta = injectQuery(() => {
    const filtros = this.aplicados();
    return {
      queryKey: [...qk.tenant(this.store.tenantSlug() ?? ''), 'rv06', filtros] as const,
      queryFn: () => this.api.vendedores(filtros),
    };
  });

  private readonly exportacion = usarExportacion(RUTAS_REPORTE.vendedores, 'vendedores');
  protected readonly exportando = this.exportacion.exportando;
  protected readonly exportar = this.exportacion.exportar;

  protected readonly moneda = formatMoneda;

  protected sinAsignar(fila: FilaVendedor): boolean {
    return fila.vendedor_id === null;
  }

  protected aplicar(): void {
    this.aplicados.set({ desde: this.desde(), hasta: this.hasta() });
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo generar el reporte.');
  }
}
