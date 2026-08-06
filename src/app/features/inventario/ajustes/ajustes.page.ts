import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type AjusteCreate, type MotivoAjuste } from '../../../api/models';
import { InventarioApi } from '../../../api/services/inventario.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatCantidad, isNegative } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { injectCatalogoNombres } from '../catalogo-nombres';
import { MOTIVO_AJUSTE_LABEL } from '../inventario.labels';
import { invalidarStock } from '../invalidar-stock';
import { AjusteFormModal } from './ajuste-form.modal';

/**
 * Ajustes de inventario: conteos físicos y mermas (RF-60).
 *
 * Se aplican de inmediato y quedan registrados con quién los capturó. No hay
 * edición ni borrado: corregir un ajuste equivocado es registrar otro que lo
 * compense, igual que en el kardex.
 */
@Component({
  selector: 'app-ajustes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AjusteFormModal, FilaMensajeComponent, IconComponent, PaginacionComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Ajustes de inventario</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Conteos físicos y mermas. La cantidad puede sumar o restar existencia.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrir()">
          <app-icon name="add" [size]="18" />
          Registrar ajuste
        </button>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Motivo</th>
              <th>Producto</th>
              <th>Almacén</th>
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
              @for (ajuste of consulta.data()?.results ?? []; track ajuste.id) {
                <tr>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(ajuste.created_at) }}
                  </td>
                  <td>{{ etiquetaMotivo(ajuste.motivo) }}</td>
                  <td>{{ nombres.producto(ajuste.producto_id) }}</td>
                  <td class="tenue">{{ nombres.almacen(ajuste.almacen_id) }}</td>
                  <td class="num font-bold" [class]="claseCantidad(ajuste.cantidad)">
                    {{ conSigno(ajuste.cantidad) }}
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="5">
                  Sin ajustes registrados. Captura un conteo físico o una merma.
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
      <app-ajuste-form-modal
        [enviando]="registro.isPending()"
        [error]="registro.error()"
        (guardar)="registrar($event)"
        (cerrar)="modalAbierto.set(false)"
      />
    }
  `,
})
export class AjustesPage {
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
      queryKey: qk.lista(slug, 'ajustes', filtros),
      queryFn: () => this.api.listarAjustes(filtros),
    };
  });

  protected readonly registro = injectMutation(() => ({
    mutationFn: (datos: AjusteCreate) => this.api.crearAjuste(datos),
    onSuccess: () => {
      this.toasts.exito('Ajuste aplicado.');
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

  protected readonly fechaHora = formatFechaHora;

  protected etiquetaMotivo(motivo: MotivoAjuste): string {
    return MOTIVO_AJUSTE_LABEL[motivo];
  }

  /** El `+` explícito deja claro de un vistazo si el ajuste sumó o restó. */
  protected conSigno(cantidad: string): string {
    const formateada = formatCantidad(cantidad);
    return isNegative(cantidad) ? formateada : `+${formateada}`;
  }

  protected claseCantidad(cantidad: string): string {
    return isNegative(cantidad) ? 'text-error' : 'text-success';
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los ajustes.');
  }

  protected abrir(): void {
    this.registro.reset();
    this.modalAbierto.set(true);
  }

  protected registrar(datos: AjusteCreate): void {
    this.registro.mutate(datos);
  }
}
