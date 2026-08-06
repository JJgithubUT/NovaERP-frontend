import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { ConfirmarPedido, Pedido } from '../../../api/models';
import { isApiError } from '../../../core/errors/api-error.model';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';

/**
 * Confirmación de un pedido (FLUJO-VENTAS §4). Es el paso que compromete de
 * verdad: reserva stock y valida el límite de crédito del cliente.
 *
 * El diálogo está construido alrededor de los dos rechazos que el backend
 * devuelve como 422, distinguibles por el campo que señalan:
 *
 * - **`credito`** — el pedido supera el límite del cliente. Se ofrece
 *   reintentar con `autorizar_credito`, que exige el permiso
 *   `finanzas:credito:autorizar`. Sin ese permiso el reintento da 403, y
 *   entonces se dice que hace falta que lo autorice alguien más.
 * - **`stock`** — no hay existencia y el tenant no permite backorder. Ahí no
 *   hay nada que forzar: el error trae el disponible real y el usuario tiene
 *   que ajustar el pedido o reponer inventario.
 *
 * La opción de autorizar no se muestra de entrada. Aparece solo cuando el
 * backend ya dijo que el crédito es el problema: ofrecerla antes invitaría a
 * saltarse un control que la mayoría de las veces ni siquiera aplica.
 */
@Component({
  selector: 'app-confirmar-pedido-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, EntityComboComponent],
  template: `
    <app-modal [titulo]="'Confirmar ' + pedido().folio" (cerrar)="cerrar.emit()">
      @if (mensajeError(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <p class="text-body-sm text-on-surface-variant">
        Al confirmar se reserva el stock del almacén elegido y se valida el crédito del cliente.
        Total del pedido: <strong class="text-on-surface">{{ moneda(pedido().total) }}</strong
        >.
      </p>

      <app-entity-combo
        etiqueta="Almacén de surtido"
        tipo="almacen"
        [valor]="almacen()"
        (valorChange)="almacen.set($event)"
        marcador="Buscar almacén…"
      />

      @if (creditoExcedido()) {
        <div
          class="flex flex-col gap-2 rounded border border-warning bg-warning-container px-3 py-2"
        >
          <p class="text-body-sm text-on-warning-container">
            Este pedido supera el límite de crédito del cliente.
          </p>

          @if (faltaPermiso()) {
            <p class="text-body-sm text-on-warning-container">
              No tienes el permiso para autorizarlo. Pide a alguien con
              <code class="font-mono">finanzas:credito:autorizar</code> que confirme el pedido.
            </p>
          } @else {
            <label class="flex items-center gap-2 text-body-sm text-on-warning-container">
              <input
                type="checkbox"
                [checked]="autorizar()"
                (change)="autorizar.set($any($event.target).checked)"
              />
              Autorizar el crédito y confirmar de todos modos
            </label>
          }
        </div>
      }

      @if (stockInsuficiente(); as detalle) {
        <div class="rounded border border-outline-variant bg-surface-container-low px-3 py-2">
          <p class="text-body-sm text-on-surface-variant">
            Sin existencia suficiente y el backorder está deshabilitado. Disponible en el almacén:
            <strong class="font-mono text-on-surface">{{ detalle }}</strong
            >.
          </p>
        </div>
      }

      <div footer>
        <button
          type="button"
          class="btn btn-secundario"
          [disabled]="enviando()"
          (click)="cerrar.emit()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primario"
          [disabled]="enviando() || !almacen()"
          (click)="enviar()"
        >
          {{ enviando() ? 'Confirmando…' : textoBoton() }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmarPedidoModal {
  readonly pedido = input.required<Pedido>();
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly confirmar = output<ConfirmarPedido>();
  readonly cerrar = output<void>();

  protected readonly almacen = signal<OpcionCombo | null>(null);
  protected readonly autorizar = signal(false);

  /** El backend ya rechazó por crédito: solo entonces se ofrece forzarlo. */
  protected readonly creditoExcedido = computed(() => campoDeError(this.error()) === 'credito');

  /** El reintento con autorización volvió 403: el actor no tiene el permiso. */
  protected readonly faltaPermiso = computed(() => {
    const error = this.error();
    return isApiError(error) && error.status === 403;
  });

  protected readonly stockInsuficiente = computed(() => {
    const error = this.error();
    if (!isApiError(error) || error.field !== 'stock') return null;

    const disponible = error.extra['disponible'];
    return typeof disponible === 'string' ? formatCantidad(disponible) : null;
  });

  protected readonly mensajeError = computed(() => {
    const error = this.error();
    if (!error) return null;
    // Crédito y stock ya se explican en sus propios bloques, con más contexto.
    if (this.creditoExcedido() || this.stockInsuficiente()) return null;
    return mensajeDeError(error);
  });

  protected readonly textoBoton = computed(() =>
    this.autorizar() ? 'Autorizar y confirmar' : 'Confirmar',
  );

  protected readonly moneda = formatMoneda;

  protected enviar(): void {
    const almacen = this.almacen();
    if (!almacen || this.enviando()) return;

    this.confirmar.emit({
      almacen_id: almacen.id,
      ...(this.autorizar() ? { autorizar_credito: true } : {}),
    });
  }
}
