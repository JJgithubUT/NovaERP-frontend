import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type CuentaPorPagar } from '../../../api/models';
import { ComprasApi } from '../../../api/services/compras.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { Big, formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { injectProveedorNombres } from '../proveedor-nombres';

/**
 * Cuentas por pagar (FLUJO-COMPRAS §5).
 *
 * Solo lectura, y no por falta de tiempo: las CxP **se crean solas** en cada
 * recepción, y registrar pagos es competencia de Finanzas, fuera del alcance
 * actual. Por eso esta pantalla no tiene ni botón de alta ni de abono.
 */
@Component({
  selector: 'app-cuentas-por-pagar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, FilaMensajeComponent, PaginacionComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div>
        <h2 class="text-headline-sm text-on-surface">Cuentas por pagar</h2>
        <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
          Se generan automáticamente con cada recepción de mercancía. El registro de pagos
          corresponde a Finanzas, así que aquí son de solo lectura.
        </p>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Origen</th>
              <th>Fecha</th>
              <th class="num">Monto original</th>
              <th class="num">Saldo</th>
              <th>Estado</th>
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
                  errorLista()
                }}
              </tr>
            } @else {
              @for (cuenta of consulta.data()?.results ?? []; track cuenta.id) {
                <tr>
                  <td class="font-medium">{{ nombres.proveedor(cuenta.proveedor_id) }}</td>
                  <td class="tenue">{{ cuenta.origen_tipo }}</td>
                  <td class="tenue whitespace-nowrap">{{ fecha(cuenta.created_at) }}</td>
                  <td class="num tenue">{{ moneda(cuenta.monto_original) }}</td>
                  <td class="num font-bold" [class.text-action]="pendiente(cuenta)">
                    {{ moneda(cuenta.saldo) }}
                  </td>
                  <td>
                    <app-badge [tono]="pendiente(cuenta) ? 'aviso' : 'exito'">
                      {{ pendiente(cuenta) ? 'Pendiente' : 'Liquidada' }}
                    </app-badge>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  Sin cuentas por pagar. Se crearán al registrar recepciones.
                </tr>
              }
            }
          </tbody>

          @if (consulta.data(); as pagina) {
            <tfoot class="border-t-2 border-outline-variant font-semibold">
              <tr>
                <td colspan="4">Saldo pendiente en esta página</td>
                <td class="num text-action">{{ saldoPagina(pagina.results) }}</td>
                <td></td>
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
export class CuentasPorPagarPage {
  private readonly api = inject(ComprasApi);
  private readonly store = inject(AuthStore);

  protected readonly nombres = injectProveedorNombres();

  protected readonly pagina = signal(1);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = { page: this.pagina(), page_size: PAGE_SIZE_DEFAULT };

    return {
      queryKey: qk.lista(slug, 'cuentas-por-pagar', filtros),
      queryFn: () => this.api.listarCuentasPorPagar(filtros),
    };
  });

  protected readonly moneda = formatMoneda;
  protected readonly fecha = formatFecha;

  protected pendiente(cuenta: CuentaPorPagar): boolean {
    return toDecimal(cuenta.saldo).gt(0);
  }

  /**
   * Solo suma la página visible, y el rótulo lo dice. El backend no devuelve un
   * total agregado en este endpoint, y presentar la suma parcial como si fuera
   * la deuda total sería engañoso.
   */
  protected saldoPagina(cuentas: readonly CuentaPorPagar[]): string {
    return formatMoneda(
      cuentas.reduce((suma, cuenta) => suma.plus(toDecimal(cuenta.saldo)), new Big(0)).toString(),
    );
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las cuentas por pagar.');
  }
}
