import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type TransferenciaCreate } from '../../../api/models';
import { InventarioApi } from '../../../api/services/inventario.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatCantidad } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { injectCatalogoNombres } from '../catalogo-nombres';
import { invalidarStock } from '../invalidar-stock';
import { TransferenciaFormModal } from './transferencia-form.modal';

/**
 * Traslados entre almacenes (RF-61).
 *
 * La tabla no tiene columna de estado ni botón de "completar", y no es un
 * olvido: el contrato (`Transferencia` en el openapi) no define ningún
 * `estado`, porque la operación es atómica. Toda transferencia que aparece
 * aquí ya está aplicada en los dos almacenes.
 */
@Component({
  selector: 'app-transferencias-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilaMensajeComponent, IconComponent, PaginacionComponent, TransferenciaFormModal],
  template: `
    <div class="flex flex-col gap-5">
      <div
        class="flex items-start gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant"
      >
        <span>
          <strong class="font-semibold text-on-surface">Todo o nada:</strong>
          la salida del origen y la entrada al destino se aplican en la misma transacción. Si una
          falla, no se aplica ninguna.
        </span>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Transferencias entre almacenes</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Traslados de existencia de un almacén a otro.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrir()">
          <app-icon name="add" [size]="18" />
          Nueva transferencia
        </button>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Origen</th>
              <th>Destino</th>
              <th class="num">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="5">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="5" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (transferencia of consulta.data()?.results ?? []; track transferencia.id) {
                <tr>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(transferencia.created_at) }}
                  </td>
                  <td>{{ nombres.producto(transferencia.producto_id) }}</td>
                  <td class="tenue">{{ nombres.almacen(transferencia.almacen_origen_id) }}</td>
                  <td class="tenue">{{ nombres.almacen(transferencia.almacen_destino_id) }}</td>
                  <td class="num font-semibold">{{ cantidad(transferencia.cantidad) }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="5">
                  Sin transferencias registradas. Crea la primera con «Nueva transferencia».
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
      <app-transferencia-form-modal
        [enviando]="registro.isPending()"
        [error]="registro.error()"
        (guardar)="registrar($event)"
        (cerrar)="modalAbierto.set(false)"
      />
    }
  `,
})
export class TransferenciasPage {
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
      queryKey: qk.lista(slug, 'transferencias', filtros),
      queryFn: () => this.api.listarTransferencias(filtros),
    };
  });

  protected readonly registro = injectMutation(() => ({
    mutationFn: (datos: TransferenciaCreate) => this.api.crearTransferencia(datos),
    onSuccess: () => {
      this.toasts.exito('Transferencia aplicada.');
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
  protected readonly fechaHora = formatFechaHora;

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las transferencias.');
  }

  protected abrir(): void {
    this.registro.reset();
    this.modalAbierto.set(true);
  }

  protected registrar(datos: TransferenciaCreate): void {
    this.registro.mutate(datos);
  }
}
