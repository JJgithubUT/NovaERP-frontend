import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type ConfirmarPedido,
  type EstadoPedido,
  type Pedido,
  type PedidoCreate,
} from '../../../api/models';
import { VentasApi } from '../../../api/services/ventas.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Big, formatCantidad, formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';
import { injectClienteNombres } from '../cliente-nombres';
import { invalidarStock } from '../../inventario/invalidar-stock';
import {
  ESTADO_PEDIDO_LABEL,
  pedidoEsCancelable,
  pedidoEsConfirmable,
  pedidoEsEditable,
  tonoPedido,
} from '../ventas.labels';
import { ConfirmarPedidoModal } from './confirmar-pedido.modal';
import { PedidoFormModal } from './pedido-form.modal';

/**
 * Pedidos (FLUJO-VENTAS §4).
 *
 * Confirmar y cancelar tocan inventario —reservan y liberan stock—, así que
 * ambas invalidan también las consultas de Inventario. Sin eso, la pantalla de
 * Stock seguiría mostrando como disponible algo que este pedido ya reservó.
 */
@Component({
  selector: 'app-pedidos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ConfirmarPedidoModal,
    FilaMensajeComponent,
    IconComponent,
    PaginacionComponent,
    PedidoFormModal,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Pedidos</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Crear solo arma el borrador. La reserva de stock y el crédito se validan al confirmar.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nuevo pedido
        </button>
      </div>

      <select
        class="campo-control sm:w-56"
        aria-label="Filtrar por estado"
        [value]="estado()"
        (change)="filtrarEstado($event)"
      >
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="confirmado">Confirmado</option>
        <option value="pendiente_surtido">Pendiente de surtido</option>
        <option value="facturado_parcial">Facturado parcial</option>
        <option value="facturado_total">Facturado total</option>
        <option value="cancelado">Cancelado</option>
      </select>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th class="num">Líneas</th>
              <th class="num">Pend. facturar</th>
              <th class="num">Total</th>
              <th><span class="sr-only">Acciones</span></th>
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
                  errorLista()
                }}
              </tr>
            } @else {
              @for (pedido of consulta.data()?.results ?? []; track pedido.id) {
                <tr>
                  <td class="clave">{{ pedido.folio }}</td>
                  <td class="tenue">{{ nombres.cliente(pedido.cliente_id) }}</td>
                  <td>
                    <app-badge [tono]="tono(pedido.estado)">
                      {{ etiquetaEstado(pedido.estado) }}
                    </app-badge>
                  </td>
                  <td class="num tenue">{{ pedido.lineas.length }}</td>
                  <td class="num tenue">{{ pendiente(pedido) }}</td>
                  <td class="num font-semibold">{{ moneda(pedido.total) }}</td>
                  <td>
                    <div class="flex justify-end gap-1.5">
                      @if (esEditable(pedido.estado)) {
                        <button type="button" class="btn-fila" (click)="abrirEdicion(pedido)">
                          Editar
                        </button>
                      }
                      @if (esConfirmable(pedido.estado)) {
                        <button type="button" class="btn-fila" (click)="abrirConfirmacion(pedido)">
                          <app-icon name="check" [size]="14" />
                          Confirmar
                        </button>
                      }
                      @if (esCancelable(pedido.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          [disabled]="cancelacion.isPending()"
                          (click)="cancelar(pedido)"
                        >
                          Cancelar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="7">
                  No hay pedidos. Crea el primero con «Nuevo pedido».
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
      <app-pedido-form-modal
        [pedido]="enEdicion()"
        [enviando]="guardado.isPending()"
        [error]="guardado.error()"
        (guardar)="guardar($event)"
        (cerrar)="cerrarModal()"
      />
    }

    @if (enConfirmacion(); as objetivo) {
      <app-confirmar-pedido-modal
        [pedido]="objetivo"
        [enviando]="confirmacion.isPending()"
        [error]="confirmacion.error()"
        (confirmar)="confirmarPedido($event)"
        (cerrar)="enConfirmacion.set(null)"
      />
    }
  `,
})
export class PedidosPage {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectClienteNombres();

  protected readonly pagina = signal(1);
  protected readonly estado = signal<EstadoPedido | ''>('');
  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Pedido | null>(null);
  protected readonly enConfirmacion = signal<Pedido | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      estado: this.estado() || undefined,
    };

    return {
      queryKey: qk.lista(slug, 'pedidos', filtros),
      queryFn: () => this.api.listarPedidos(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: PedidoCreate) => {
      const existente = this.enEdicion();
      return existente && 'lineas' in datos
        ? this.api.editarPedido(existente.id, { lineas: datos.lineas })
        : this.api.crearPedido(datos);
    },
    onSuccess: (pedido) => {
      this.toasts.exito(`Pedido ${pedido.folio} guardado en borrador.`);
      this.refrescar();
      this.cerrarModal();
    },
  }));

  protected readonly confirmacion = injectMutation(() => ({
    mutationFn: (datos: ConfirmarPedido) =>
      this.api.confirmarPedido(this.enConfirmacion()!.id, datos),
    onSuccess: (pedido) => {
      this.toasts.exito(
        pedido.estado === 'pendiente_surtido'
          ? `${pedido.folio} confirmado con backorder: se reservó lo disponible.`
          : `${pedido.folio} confirmado y stock reservado.`,
      );
      this.refrescar();
      this.enConfirmacion.set(null);
    },
    // El error se queda en el diálogo: es ahí donde se ofrece autorizar el
    // crédito o corregir el almacén.
  }));

  protected readonly cancelacion = injectMutation(() => ({
    mutationFn: (pedido: Pedido) => this.api.cancelarPedido(pedido.id),
    onSuccess: (pedido) => {
      this.toasts.exito(`${pedido.folio} cancelado y stock liberado.`);
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  protected readonly moneda = formatMoneda;
  protected readonly tono = tonoPedido;
  protected readonly esEditable = pedidoEsEditable;
  protected readonly esConfirmable = pedidoEsConfirmable;
  protected readonly esCancelable = pedidoEsCancelable;

  protected etiquetaEstado(estado: EstadoPedido): string {
    return ESTADO_PEDIDO_LABEL[estado];
  }

  /**
   * Suma de lo que queda por facturar, para ver de un vistazo qué falta.
   * Con Big y no con `Number`: son cantidades decimales del backend.
   */
  protected pendiente(pedido: Pedido): string {
    const total = pedido.lineas.reduce(
      (suma, linea) => suma.plus(toDecimal(linea.pendiente_facturar)),
      new Big(0),
    );
    return formatCantidad(total.toString());
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar los pedidos.');
  }

  protected filtrarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoPedido | '');
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirEdicion(pedido: Pedido): void {
    this.enEdicion.set(pedido);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirConfirmacion(pedido: Pedido): void {
    this.confirmacion.reset();
    this.enConfirmacion.set(pedido);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: PedidoCreate): void {
    this.guardado.mutate(datos);
  }

  protected confirmarPedido(datos: ConfirmarPedido): void {
    this.confirmacion.mutate(datos);
  }

  protected cancelar(pedido: Pedido): void {
    this.cancelacion.mutate(pedido);
  }

  /**
   * Confirmar reserva stock y cancelar lo libera, así que las pantallas de
   * Inventario quedan desfasadas igual que las de Ventas.
   */
  private refrescar(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'pedidos') });
    invalidarStock(this.queryClient, slug);
  }
}
