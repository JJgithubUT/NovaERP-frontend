import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type EstadoFactura,
  type Factura,
  type FacturaCreate,
  type NotaCreditoCreate,
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
import { formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { injectClienteNombres } from '../cliente-nombres';
import { invalidarStock } from '../../inventario/invalidar-stock';
import { ESTADO_FACTURA_LABEL, tonoFactura } from '../ventas.labels';
import { FacturaFormModal } from './factura-form.modal';
import { NotaCreditoModal } from './nota-credito.modal';

/**
 * Facturas y notas de crédito (FLUJO-VENTAS §5).
 *
 * No hay editar ni eliminar, y no falta nada: una factura emitida es
 * inmutable por integridad fiscal. La única acción correctiva es la nota de
 * crédito, y solo mientras quede saldo por cobrar.
 */
@Component({
  selector: 'app-facturas-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    FacturaFormModal,
    FilaMensajeComponent,
    IconComponent,
    NotaCreditoModal,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Facturas</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Una factura emitida no se edita ni se borra: se corrige con una nota de crédito.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nueva factura
        </button>
      </div>

      <select
        class="campo-control sm:w-56"
        aria-label="Filtrar por estado"
        [value]="estado()"
        (change)="filtrarEstado($event)"
      >
        <option value="">Todos los estados</option>
        <option value="emitida">Emitida</option>
        <option value="con_nota_credito">Con nota de crédito</option>
        <option value="cancelada">Cancelada</option>
      </select>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Emisión</th>
              <th>Estado</th>
              <th class="num">Subtotal</th>
              <th class="num">Impuestos</th>
              <th class="num">Total</th>
              <th class="num">Saldo CxC</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="9">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="9" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (factura of consulta.data()?.results ?? []; track factura.id) {
                <tr>
                  <td class="clave">{{ factura.folio }}</td>
                  <td class="tenue">{{ nombres.cliente(factura.cliente_id) }}</td>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(factura.fecha_emision) }}
                  </td>
                  <td>
                    <app-badge [tono]="tono(factura.estado)">
                      {{ etiquetaEstado(factura.estado) }}
                    </app-badge>
                  </td>
                  <td class="num tenue">{{ moneda(factura.subtotal) }}</td>
                  <td class="num tenue">{{ moneda(factura.impuestos) }}</td>
                  <td class="num font-semibold">{{ moneda(factura.total) }}</td>
                  <td class="num" [class.text-warning]="tieneSaldo(factura)">
                    {{ factura.cxc_saldo ? moneda(factura.cxc_saldo) : '—' }}
                  </td>
                  <td class="text-right">
                    @if (admiteNotaCredito(factura)) {
                      <button type="button" class="btn-fila" (click)="abrirNotaCredito(factura)">
                        Nota de crédito
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="9">
                  No hay facturas. Emite la primera desde un pedido confirmado.
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
      <app-factura-form-modal
        [enviando]="emision.isPending()"
        [error]="emision.error()"
        (guardar)="emitir($event)"
        (cerrar)="modalAbierto.set(false)"
      />
    }

    @if (enNotaCredito(); as objetivo) {
      <app-nota-credito-modal
        [factura]="objetivo"
        [enviando]="notaCredito.isPending()"
        [error]="notaCredito.error()"
        (confirmar)="confirmarNotaCredito($event)"
        (cerrar)="enNotaCredito.set(null)"
      />
    }
  `,
})
export class FacturasPage {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectClienteNombres();

  protected readonly pagina = signal(1);
  protected readonly estado = signal<EstadoFactura | ''>('');
  protected readonly modalAbierto = signal(false);
  protected readonly enNotaCredito = signal<Factura | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      estado: this.estado() || undefined,
    };

    return {
      queryKey: qk.lista(slug, 'facturas', filtros),
      queryFn: () => this.api.listarFacturas(filtros),
    };
  });

  protected readonly emision = injectMutation(() => ({
    mutationFn: (datos: FacturaCreate) => this.api.crearFactura(datos),
    onSuccess: (factura) => {
      this.toasts.exito(`Factura ${factura.folio} emitida por ${formatMoneda(factura.total)}.`);
      this.refrescar();
      this.modalAbierto.set(false);
    },
  }));

  protected readonly notaCredito = injectMutation(() => ({
    mutationFn: (datos: NotaCreditoCreate) =>
      this.api.emitirNotaCredito(this.enNotaCredito()!.id, datos),
    onSuccess: () => {
      this.toasts.exito('Nota de crédito emitida.');
      this.refrescar();
      this.enNotaCredito.set(null);
    },
  }));

  protected readonly moneda = formatMoneda;
  protected readonly fechaHora = formatFechaHora;
  protected readonly tono = tonoFactura;

  protected etiquetaEstado(estado: EstadoFactura): string {
    return ESTADO_FACTURA_LABEL[estado];
  }

  protected tieneSaldo(factura: Factura): boolean {
    return factura.cxc_saldo !== null && toDecimal(factura.cxc_saldo).gt(0);
  }

  /** Sin saldo vivo no hay nada que acreditar; una cancelada tampoco admite. */
  protected admiteNotaCredito(factura: Factura): boolean {
    return factura.estado !== 'cancelada' && this.tieneSaldo(factura);
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las facturas.');
  }

  protected filtrarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoFactura | '');
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.emision.reset();
    this.modalAbierto.set(true);
  }

  protected abrirNotaCredito(factura: Factura): void {
    this.notaCredito.reset();
    this.enNotaCredito.set(factura);
  }

  protected emitir(datos: FacturaCreate): void {
    this.emision.mutate(datos);
  }

  protected confirmarNotaCredito(datos: NotaCreditoCreate): void {
    this.notaCredito.mutate(datos);
  }

  /**
   * Facturar convierte la reserva en salida de inventario, y una nota de
   * crédito total puede reingresarla. Además cambia el estado del pedido.
   */
  private refrescar(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'facturas') });
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'pedidos') });
    invalidarStock(this.queryClient, slug);
  }
}
