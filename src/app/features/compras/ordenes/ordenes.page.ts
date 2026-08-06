import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type EstadoOrdenCompra,
  type OrdenCompra,
  type OrdenCompraCreate,
} from '../../../api/models';
import { ComprasApi } from '../../../api/services/compras.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import {
  ESTADO_ORDEN_LABEL,
  ordenEsAprobable,
  ordenEsCancelable,
  ordenEsEditable,
  pendienteDeOrden,
  tonoOrden,
} from '../compras.labels';
import { injectProveedorNombres } from '../proveedor-nombres';
import { OrdenFormModal } from './orden-form.modal';

/**
 * Órdenes de compra (FLUJO-COMPRAS §3).
 *
 * «Aprobar» es un PATCH que mueve el estado a `enviada`, no un endpoint
 * dedicado: la aprobación es manual y no dispara efectos por sí sola. Lo que
 * de verdad cambia es lo que desbloquea — hasta entonces la orden no admite
 * recepciones.
 *
 * Recibir mercancía no se hace desde aquí sino en la pestaña de Recepciones,
 * que solo ofrece las órdenes ya aprobadas y con algo pendiente. Se separan
 * porque una recepción necesita almacén y cantidades por línea: no cabe en el
 * botón de una fila.
 */
@Component({
  selector: 'app-ordenes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    FilaMensajeComponent,
    IconComponent,
    OrdenFormModal,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Órdenes de compra</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            El folio lo genera el sistema. Una orden por encima del umbral nace pendiente de
            aprobación.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nueva orden
        </button>
      </div>

      <select
        class="campo-control sm:w-60"
        aria-label="Filtrar por estado"
        [value]="estado()"
        (change)="filtrarEstado($event)"
      >
        <option value="">Todos los estados</option>
        <option value="pendiente_aprobacion">Pendiente de aprobación</option>
        <option value="enviada">Enviada</option>
        <option value="recibida_parcial">Recibida parcial</option>
        <option value="recibida_total">Recibida total</option>
        <option value="cancelada">Cancelada</option>
      </select>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th class="num">Líneas</th>
              <th class="num">Pend. recibir</th>
              <th class="num">Total</th>
              <th><span class="sr-only">Acciones</span></th>
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
                  errorLista()
                }}
              </tr>
            } @else {
              @for (orden of consulta.data()?.results ?? []; track orden.id) {
                <tr>
                  <td class="clave">{{ orden.folio }}</td>
                  <td class="tenue">{{ nombres.proveedor(orden.proveedor_id) }}</td>
                  <td>
                    <app-badge [tono]="tono(orden.estado)">
                      {{ etiquetaEstado(orden.estado) }}
                    </app-badge>
                  </td>
                  <td class="tenue whitespace-nowrap">{{ fecha(orden.created_at) }}</td>
                  <td class="num tenue">{{ orden.lineas.length }}</td>
                  <td class="num tenue">{{ pendiente(orden) }}</td>
                  <td class="num font-semibold">{{ moneda(orden.total) }}</td>
                  <td>
                    <div class="flex justify-end gap-1.5">
                      @if (esAprobable(orden.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          [disabled]="aprobacion.isPending()"
                          (click)="aprobar(orden)"
                        >
                          <app-icon name="check" [size]="14" />
                          Aprobar
                        </button>
                      }
                      @if (esEditable(orden)) {
                        <button type="button" class="btn-fila" (click)="abrirEdicion(orden)">
                          Editar
                        </button>
                      }
                      @if (esCancelable(orden.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          [disabled]="cancelacion.isPending()"
                          (click)="cancelar(orden)"
                        >
                          Cancelar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="8">
                  No hay órdenes de compra. Crea la primera con «Nueva orden».
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
      <app-orden-form-modal
        [orden]="enEdicion()"
        [enviando]="guardado.isPending()"
        [error]="guardado.error()"
        (guardar)="guardar($event)"
        (cerrar)="cerrarModal()"
      />
    }
  `,
})
export class OrdenesPage {
  private readonly api = inject(ComprasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectProveedorNombres();

  protected readonly pagina = signal(1);
  protected readonly estado = signal<EstadoOrdenCompra | ''>('');
  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<OrdenCompra | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      estado: this.estado() || undefined,
    };

    return {
      queryKey: qk.lista(slug, 'ordenes-compra', filtros),
      queryFn: () => this.api.listarOrdenes(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: OrdenCompraCreate) => {
      const existente = this.enEdicion();
      return existente
        ? this.api.editarOrden(existente.id, { lineas: datos.lineas })
        : this.api.crearOrden(datos);
    },
    onSuccess: (orden) => {
      this.toasts.exito(
        orden.estado === 'pendiente_aprobacion'
          ? `${orden.folio} quedó pendiente de aprobación por superar el umbral.`
          : `Orden ${orden.folio} guardada.`,
      );
      this.refrescar();
      this.cerrarModal();
    },
  }));

  protected readonly aprobacion = injectMutation(() => ({
    mutationFn: (orden: OrdenCompra) => this.api.aprobarOrden(orden.id),
    onSuccess: (orden) => {
      this.toasts.exito(`${orden.folio} aprobada. Ya admite recepciones.`);
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  protected readonly cancelacion = injectMutation(() => ({
    mutationFn: (orden: OrdenCompra) => this.api.cancelarOrden(orden.id),
    onSuccess: (orden) => {
      this.toasts.exito(`${orden.folio} cancelada. No admitirá más recepciones.`);
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  protected readonly moneda = formatMoneda;
  protected readonly fecha = formatFecha;
  protected readonly tono = tonoOrden;
  protected readonly esAprobable = ordenEsAprobable;
  protected readonly esCancelable = ordenEsCancelable;
  protected readonly esEditable = ordenEsEditable;

  protected etiquetaEstado(estado: EstadoOrdenCompra): string {
    return ESTADO_ORDEN_LABEL[estado];
  }

  protected pendiente(orden: OrdenCompra): string {
    return formatCantidad(pendienteDeOrden(orden).toString());
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las órdenes.');
  }

  protected filtrarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoOrdenCompra | '');
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirEdicion(orden: OrdenCompra): void {
    this.enEdicion.set(orden);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: OrdenCompraCreate): void {
    this.guardado.mutate(datos);
  }

  protected aprobar(orden: OrdenCompra): void {
    this.aprobacion.mutate(orden);
  }

  protected cancelar(orden: OrdenCompra): void {
    this.cancelacion.mutate(orden);
  }

  private refrescar(): void {
    void this.queryClient.invalidateQueries({
      queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'ordenes-compra'),
    });
  }
}
