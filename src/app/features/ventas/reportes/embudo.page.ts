import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { EtapaEmbudo, QueryEmbudo } from '../../../api/models';
import { ReportesApi, RUTAS_REPORTE } from '../../../api/services/reportes.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { ReporteHeaderComponent } from './reporte-header.component';
import { rangoPorDefecto, usarExportacion } from './usar-reporte';

const ETAPA_LABEL: Readonly<Record<EtapaEmbudo, string>> = {
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  pedidos: 'Pedidos',
  facturas: 'Facturas',
};

/**
 * RV-04 · Embudo comercial de oportunidad a factura.
 *
 * Dos advertencias que cambian la lectura, y por eso están en pantalla:
 *
 * - Cada etapa cuenta documentos **creados en el rango** — es el flujo del
 *   periodo, no una foto del estado actual.
 * - `conversion_pct` compara con la etapa anterior; no sigue documento a
 *   documento. Una cotización de este mes puede venir de una oportunidad del
 *   mes pasado, y aun así cuenta.
 */
@Component({
  selector: 'app-embudo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReporteHeaderComponent],
  template: `
    <div class="flex flex-col gap-5">
      <app-reporte-header
        titulo="Embudo comercial"
        descripcion="Documentos creados en el rango, etapa por etapa, y en qué proporción avanzan."
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

      @if (consulta.isPending()) {
        <p class="py-8 text-center text-body-sm text-on-surface-variant">Cargando…</p>
      } @else if (consulta.isError()) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ error() }}
        </p>
      } @else if (consulta.data(); as reporte) {
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          @for (etapa of reporte.resultados; track etapa.etapa) {
            <article
              class="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
            >
              <h3 class="text-label-caps uppercase text-on-surface-variant">
                {{ etiquetaEtapa(etapa.etapa) }}
              </h3>
              <p class="text-display-lg leading-none text-on-surface">{{ etapa.conteo }}</p>
              <p class="font-mono text-body-sm tabular-nums text-on-surface-variant">
                {{ moneda(etapa.monto) }}
              </p>

              <p class="mt-auto border-t border-outline-variant pt-2 text-label-md">
                @if (etapa.conversion_pct) {
                  <span class="font-bold text-action">{{ etapa.conversion_pct }} %</span>
                  <span class="text-on-surface-variant"> desde la etapa anterior</span>
                } @else {
                  <span class="text-on-surface-variant">Punto de entrada</span>
                }
              </p>
            </article>
          }
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <section class="flex flex-col gap-2">
            <h3 class="text-headline-sm text-on-surface">Resumen del periodo</h3>
            <dl class="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
              @for (dato of resumen(reporte.totales); track dato.etiqueta) {
                <div
                  class="flex items-baseline justify-between gap-3 border-b border-outline-variant py-1.5 last:border-0"
                >
                  <dt class="text-body-sm text-on-surface-variant">{{ dato.etiqueta }}</dt>
                  <dd class="font-mono text-body-sm font-semibold tabular-nums">
                    {{ dato.valor }}
                  </dd>
                </div>
              }
            </dl>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="text-headline-sm text-on-surface">Motivos de pérdida</h3>
            <div class="tabla-scroll">
              <table class="tabla">
                <thead>
                  <tr>
                    <th>Motivo</th>
                    <th class="num">Oportunidades</th>
                  </tr>
                </thead>
                <tbody>
                  @for (motivo of reporte.motivos_perdida; track motivo.motivo) {
                    <tr>
                      <td>{{ motivo.motivo }}</td>
                      <td class="num font-semibold">{{ motivo.conteo }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="2" class="px-3 py-6 text-center text-on-surface-variant">
                        Ninguna oportunidad perdida en el rango.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class EmbudoPage {
  private readonly api = inject(ReportesApi);
  private readonly store = inject(AuthStore);

  private readonly inicial = rangoPorDefecto();

  protected readonly desde = signal(this.inicial.desde);
  protected readonly hasta = signal(this.inicial.hasta);

  protected readonly aplicados = signal<QueryEmbudo>({
    desde: this.inicial.desde,
    hasta: this.inicial.hasta,
  });

  protected readonly consulta = injectQuery(() => {
    const filtros = this.aplicados();
    return {
      queryKey: [...qk.tenant(this.store.tenantSlug() ?? ''), 'rv04', filtros] as const,
      queryFn: () => this.api.embudo(filtros),
    };
  });

  private readonly exportacion = usarExportacion(RUTAS_REPORTE.embudo, 'embudo');
  protected readonly exportando = this.exportacion.exportando;
  protected readonly exportar = this.exportacion.exportar;

  protected readonly moneda = formatMoneda;

  protected aplicar(): void {
    this.aplicados.set({ desde: this.desde(), hasta: this.hasta() });
  }

  protected etiquetaEtapa(etapa: EtapaEmbudo): string {
    return ETAPA_LABEL[etapa];
  }

  /** Aplana los totales a pares etiqueta/valor: son diez claves heterogéneas. */
  protected resumen(totales: NonNullable<ReturnType<typeof this.consulta.data>>['totales']) {
    return [
      { etiqueta: 'Oportunidades abiertas', valor: String(totales.oportunidades_abiertas) },
      { etiqueta: 'Oportunidades ganadas', valor: String(totales.oportunidades_ganadas) },
      { etiqueta: 'Oportunidades perdidas', valor: String(totales.oportunidades_perdidas) },
      { etiqueta: 'Tasa de cierre ganado', valor: porcentaje(totales.tasa_cierre_ganado_pct) },
      { etiqueta: 'Cotizaciones aprobadas', valor: String(totales.cotizaciones_aprobadas) },
      { etiqueta: 'Cotizaciones rechazadas', valor: String(totales.cotizaciones_rechazadas) },
      { etiqueta: 'Cotizaciones vencidas', valor: String(totales.cotizaciones_vencidas) },
      { etiqueta: 'Tasa de aprobación', valor: porcentaje(totales.tasa_aprobacion_pct) },
      { etiqueta: 'Pedidos cancelados', valor: String(totales.pedidos_cancelados) },
      { etiqueta: 'Venta facturada', valor: formatMoneda(totales.venta_facturada) },
    ];
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo generar el reporte.');
  }
}

function porcentaje(valor: string | null): string {
  return valor === null ? '—' : `${valor} %`;
}
