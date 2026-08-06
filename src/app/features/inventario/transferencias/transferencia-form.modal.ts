import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { TransferenciaCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { isNonNegative } from '../../../shared/utils/decimal.util';

/**
 * Traslado de existencia entre almacenes (RF-61).
 *
 * Es **atómica**: el backend registra la salida del origen y la entrada al
 * destino en la misma transacción. No hay estado intermedio que confirmar
 * después — o se aplican las dos o no se aplica ninguna.
 */
@Component({
  selector: 'app-transferencia-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent, EntityComboComponent],
  template: `
    <app-modal titulo="Nueva transferencia" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <app-entity-combo
        etiqueta="Producto"
        tipo="producto"
        [valor]="producto()"
        (valorChange)="producto.set($event)"
        marcador="Buscar por SKU o nombre…"
      />

      <app-entity-combo
        etiqueta="Almacén origen"
        tipo="almacen"
        [valor]="origen()"
        (valorChange)="origen.set($event)"
        marcador="Buscar almacén…"
      />

      <app-entity-combo
        etiqueta="Almacén destino"
        tipo="almacen"
        [valor]="destino()"
        (valorChange)="destino.set($event)"
        marcador="Buscar almacén…"
      />

      @if (mismoAlmacen()) {
        <p class="text-label-md text-error" role="alert">
          El origen y el destino no pueden ser el mismo almacén.
        </p>
      }

      <app-campo etiqueta="Cantidad" paraId="cantidad" [error]="errorCantidad()">
        <input
          id="cantidad"
          class="campo-control"
          inputmode="decimal"
          [value]="cantidad()"
          (input)="cantidad.set($any($event.target).value)"
        />
      </app-campo>

      <p class="text-label-md text-on-surface-variant">
        Se valida que haya existencia suficiente en el origen antes de mover.
      </p>

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
          [disabled]="enviando() || !valido()"
          (click)="enviar()"
        >
          {{ enviando() ? 'Transfiriendo…' : 'Transferir' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class TransferenciaFormModal {
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<TransferenciaCreate>();
  readonly cerrar = output<void>();

  protected readonly producto = signal<OpcionCombo | null>(null);
  protected readonly origen = signal<OpcionCombo | null>(null);
  protected readonly destino = signal<OpcionCombo | null>(null);
  protected readonly cantidad = signal('');

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  /**
   * Se valida aquí y no solo en el backend porque es el error más fácil de
   * cometer con dos combos idénticos seguidos, y avisar antes de enviar ahorra
   * un viaje de ida y vuelta para un 422 evitable.
   */
  protected readonly mismoAlmacen = computed(() => {
    const origen = this.origen();
    const destino = this.destino();
    return origen !== null && destino !== null && origen.id === destino.id;
  });

  protected readonly errorCantidad = computed(() => {
    const valor = this.cantidad().trim();
    if (valor !== '' && !isNonNegative(valor)) return 'Debe ser un número mayor o igual a 0.';
    return campoDeError(this.error()) === 'cantidad' ? mensajeDeError(this.error()) : '';
  });

  protected readonly valido = computed(
    () =>
      this.producto() !== null &&
      this.origen() !== null &&
      this.destino() !== null &&
      !this.mismoAlmacen() &&
      isNonNegative(this.cantidad()),
  );

  protected enviar(): void {
    const producto = this.producto();
    const origen = this.origen();
    const destino = this.destino();
    if (!producto || !origen || !destino || !this.valido() || this.enviando()) return;

    this.guardar.emit({
      producto_id: producto.id,
      almacen_origen_id: origen.id,
      almacen_destino_id: destino.id,
      cantidad: this.cantidad().trim(),
    });
  }
}
