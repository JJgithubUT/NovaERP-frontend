import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { QueryCartera } from '../../../api/models';
import { ReportesApi, RUTAS_REPORTE } from '../../../api/services/reportes.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { aFechaIso } from '../../../shared/utils/fecha.util';
import { ReporteHeaderComponent } from './reporte-header.component';
import { usarExportacion } from './usar-reporte';

/**
 * RV-05 · Antigüedad de saldos por cobrar.
 *
 * Es el único reporte que **no usa rango**: es una foto a la fecha de `corte`,
 * y el saldo se reconstruye a esa fecha (monto original menos los abonos
 * anteriores al corte), no se lee el saldo de hoy. Por eso el encabezado va en
 * modo `corte`.
 *
 * La antigüedad cuenta **días desde la emisión**, no días vencidos: el esquema
 * no modela fecha de vencimiento ni días de crédito. El backend lo declara en
 * `criterio` y aquí se muestra tal cual, porque llamar "vencido" a un cubo de
 * 90 días sería afirmar algo que estos datos no sostienen.
 */
@Component({
  selector: 'app-cartera-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReporteHeaderComponent, FilaMensajeComponent],
  template: `
    <div class="flex flex-col gap-5">
      <app-reporte-header
        titulo="Cartera por antigüedad"
        descripcion="Saldos por cobrar a una fecha de corte, repartidos por antigüedad."
        modo="corte"
        [(corte)]="corte"
        [cargando]="consulta.isFetching()"
        [exportando]="exportando()"
        [alcanceVendedor]="consulta.data()?.alcance_vendedor ?? null"
        [generadoEn]="consulta.data()?.generado_en"
        (buscar)="aplicar()"
        (exportar)="exportar(aplicados(), $event)"
      />

      @if (consulta.data()?.criterio; as criterio) {
        <p
          class="rounded border border-outline-variant bg-warning-container px-3 py-2 text-body-sm text-on-warning-container"
        >
          <strong class="font-semibold">Criterio:</strong> {{ criterio }}
        </p>
      }

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th class="num">Facturas</th>
              <th class="num">0–30 días</th>
              <th class="num">31–60</th>
              <th class="num">61–90</th>
              <th class="num">Más de 90</th>
              <th class="num">Saldo total</th>
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
              @for (fila of consulta.data()?.resultados ?? []; track fila.cliente_id) {
                <tr>
                  <td class="font-medium">{{ fila.razon_social }}</td>
                  <td class="num tenue">{{ fila.num_facturas }}</td>
                  <td class="num tenue">{{ moneda(fila.dias_0_30) }}</td>
                  <td class="num tenue">{{ moneda(fila.dias_31_60) }}</td>
                  <td class="num">{{ moneda(fila.dias_61_90) }}</td>
                  <td class="num font-semibold text-error">{{ moneda(fila.dias_90_mas) }}</td>
                  <td class="num font-bold text-action">{{ moneda(fila.saldo_total) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="7">
                  Sin saldos por cobrar a la fecha de corte.
                </tr>
              }
            }
          </tbody>

          @if (consulta.data(); as reporte) {
            <tfoot class="border-t-2 border-outline-variant font-semibold">
              <tr>
                <td>Total ({{ reporte.totales.num_clientes }} clientes)</td>
                <td class="num">{{ reporte.totales.num_facturas }}</td>
                <td class="num">{{ moneda(reporte.totales.dias_0_30) }}</td>
                <td class="num">{{ moneda(reporte.totales.dias_31_60) }}</td>
                <td class="num">{{ moneda(reporte.totales.dias_61_90) }}</td>
                <td class="num text-error">{{ moneda(reporte.totales.dias_90_mas) }}</td>
                <td class="num text-action">{{ moneda(reporte.totales.saldo_total) }}</td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  `,
})
export class CarteraPage {
  private readonly api = inject(ReportesApi);
  private readonly store = inject(AuthStore);

  private readonly hoy = aFechaIso(new Date());

  protected readonly corte = signal(this.hoy);
  protected readonly aplicados = signal<QueryCartera>({ corte: this.hoy });

  protected readonly consulta = injectQuery(() => {
    const filtros = this.aplicados();
    return {
      queryKey: [...qk.tenant(this.store.tenantSlug() ?? ''), 'rv05', filtros] as const,
      queryFn: () => this.api.cartera(filtros),
    };
  });

  private readonly exportacion = usarExportacion(RUTAS_REPORTE.cartera, 'cartera');
  protected readonly exportando = this.exportacion.exportando;
  protected readonly exportar = this.exportacion.exportar;

  protected readonly moneda = formatMoneda;

  protected aplicar(): void {
    this.aplicados.set({ corte: this.corte() });
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo generar el reporte.');
  }
}
