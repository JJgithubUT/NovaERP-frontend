import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { EstadoOrdenCompra, Proveedor } from '../../../api/models';
import { ComprasApi } from '../../../api/services/compras.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { ESTADO_ORDEN_LABEL, tonoOrden } from '../compras.labels';

/**
 * Ficha completa del proveedor (RF-51): órdenes, recepciones y cuentas por
 * pagar en un solo payload.
 *
 * No está paginada por diseño del backend, así que se pide entera al abrir el
 * diálogo. Es la única llamada del módulo que puede devolver un cuerpo grande;
 * si un proveedor con años de historia llegara a pesar, el sitio para acotarlo
 * sería el endpoint, no aquí.
 */
@Component({
  selector: 'app-historial-proveedor-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, BadgeComponent],
  template: `
    <app-modal
      [titulo]="'Historial · ' + proveedor().razon_social"
      ancho="lg"
      (cerrar)="cerrar.emit()"
    >
      @if (consulta.isPending()) {
        <p class="py-6 text-center text-body-sm text-on-surface-variant">Cargando…</p>
      } @else if (consulta.isError()) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ error() }}
        </p>
      } @else if (consulta.data(); as historial) {
        <section class="flex flex-col gap-2">
          <h3 class="text-label-caps uppercase text-on-surface-variant">
            Órdenes ({{ historial.ordenes.length }})
          </h3>
          <div class="tabla-scroll">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (orden of historial.ordenes; track orden.id) {
                  <tr>
                    <td class="clave">{{ orden.folio }}</td>
                    <td>
                      <app-badge [tono]="tono(orden.estado)">
                        {{ etiquetaEstado(orden.estado) }}
                      </app-badge>
                    </td>
                    <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                      {{ fechaHora(orden.created_at) }}
                    </td>
                    <td class="num font-semibold">{{ moneda(orden.total) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="px-3 py-4 text-center text-on-surface-variant">
                      Sin órdenes registradas.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="text-label-caps uppercase text-on-surface-variant">
            Recepciones ({{ historial.recepciones.length }})
          </h3>
          <div class="tabla-scroll">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th class="num">Líneas</th>
                </tr>
              </thead>
              <tbody>
                @for (recepcion of historial.recepciones; track recepcion.id) {
                  <tr>
                    <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                      {{ fechaHora(recepcion.created_at) }}
                    </td>
                    <td class="num">{{ recepcion.lineas.length }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="2" class="px-3 py-4 text-center text-on-surface-variant">
                      Sin recepciones registradas.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="text-label-caps uppercase text-on-surface-variant">
            Cuentas por pagar ({{ historial.cuentas_por_pagar.length }})
          </h3>
          <div class="tabla-scroll">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Origen</th>
                  <th>Fecha</th>
                  <th class="num">Monto original</th>
                  <th class="num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                @for (cuenta of historial.cuentas_por_pagar; track cuenta.id) {
                  <tr>
                    <td class="tenue">{{ cuenta.origen_tipo }}</td>
                    <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                      {{ fechaHora(cuenta.created_at) }}
                    </td>
                    <td class="num tenue">{{ moneda(cuenta.monto_original) }}</td>
                    <td class="num font-bold text-action">{{ moneda(cuenta.saldo) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="px-3 py-4 text-center text-on-surface-variant">
                      Sin cuentas por pagar.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <div footer>
        <button type="button" class="btn btn-secundario" (click)="cerrar.emit()">Cerrar</button>
      </div>
    </app-modal>
  `,
})
export class HistorialProveedorModal {
  private readonly api = inject(ComprasApi);
  private readonly store = inject(AuthStore);

  readonly proveedor = input.required<Proveedor>();
  readonly cerrar = output<void>();

  protected readonly consulta = injectQuery(() => {
    const id = this.proveedor().id;
    return {
      queryKey: qk.detalle(this.store.tenantSlug() ?? '', 'proveedores', `${id}:historial`),
      queryFn: () => this.api.historialProveedor(id),
    };
  });

  protected readonly moneda = formatMoneda;
  protected readonly fechaHora = formatFechaHora;
  protected readonly tono = tonoOrden;

  protected etiquetaEstado(estado: EstadoOrdenCompra): string {
    return ESTADO_ORDEN_LABEL[estado];
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar el historial.');
  }
}
