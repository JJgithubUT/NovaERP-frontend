import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type MovimientoCreate, type TipoMovimiento } from '../../../api/models';
import { InventarioApi } from '../../../api/services/inventario.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { injectCatalogoNombres } from '../catalogo-nombres';
import { TIPO_MOVIMIENTO_LABEL, tonoDeTipo } from '../inventario.labels';
import { MovimientoFormModal } from './movimiento-form.modal';
import { invalidarStock } from '../invalidar-stock';

/**
 * Alta de entradas y salidas manuales, con su histórico (RF-58).
 *
 * Se separa del Kardex a propósito: el kardex es la vista de consulta
 * —completa, con nombres resueltos por la vista SQL y todos los tipos— y esta
 * es la pantalla de captura, que además lista lo registrado para confirmar que
 * el movimiento entró.
 */
@Component({
  selector: 'app-movimientos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    FilaMensajeComponent,
    IconComponent,
    MovimientoFormModal,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Movimientos manuales</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Entradas y salidas capturadas a mano. El stock nunca se edita: siempre se mueve.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrir()">
          <app-icon name="add" [size]="18" />
          Nuevo movimiento
        </button>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th class="num">Cantidad</th>
              <th class="num">Costo unit.</th>
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
              @for (mov of consulta.data()?.results ?? []; track mov.id) {
                <tr>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(mov.ocurrido_en) }}
                  </td>
                  <td>
                    <app-badge [tono]="tono(mov.tipo)">{{ etiquetaTipo(mov.tipo) }}</app-badge>
                  </td>
                  <td>{{ nombres.producto(mov.producto_id) }}</td>
                  <td class="tenue">{{ nombres.almacen(mov.almacen_id) }}</td>
                  <td class="num font-semibold">{{ cantidad(mov.cantidad) }}</td>
                  <td class="num tenue">
                    {{ mov.costo_unitario ? moneda(mov.costo_unitario) : '—' }}
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  Sin movimientos registrados. Captura el primero con «Nuevo movimiento».
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

    @if (modalAbierto()) {
      <app-movimiento-form-modal
        [enviando]="registro.isPending()"
        [error]="registro.error()"
        (guardar)="registrar($event)"
        (cerrar)="modalAbierto.set(false)"
      />
    }
  `,
})
export class MovimientosPage {
  private readonly api = inject(InventarioApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectCatalogoNombres();

  protected readonly pagina = signal(1);
  protected readonly modalAbierto = signal(false);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = { page: this.pagina(), page_size: PAGE_SIZE_DEFAULT };

    return {
      queryKey: qk.lista(slug, 'movimientos', filtros),
      queryFn: () => this.api.listarMovimientos(filtros),
    };
  });

  protected readonly registro = injectMutation(() => ({
    mutationFn: (datos: MovimientoCreate) => this.api.crearMovimiento(datos),
    onSuccess: () => {
      this.toasts.exito('Movimiento registrado.');
      invalidarStock(this.queryClient, this.store.tenantSlug() ?? '');
      this.modalAbierto.set(false);
    },
    onError: (error: unknown) => {
      if (isApiError(error) && error.queued) {
        this.toasts.aviso(error.message);
        this.modalAbierto.set(false);
      }
    },
  }));

  protected readonly cantidad = formatCantidad;
  protected readonly moneda = formatMoneda;
  protected readonly fechaHora = formatFechaHora;
  protected readonly tono = tonoDeTipo;

  protected etiquetaTipo(tipo: TipoMovimiento): string {
    return TIPO_MOVIMIENTO_LABEL[tipo];
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los movimientos.');
  }

  protected abrir(): void {
    this.registro.reset();
    this.modalAbierto.set(true);
  }

  protected registrar(datos: MovimientoCreate): void {
    this.registro.mutate(datos);
  }
}
