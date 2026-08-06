import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { MovimientoCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { isNonNegative, isValidDecimal } from '../../../shared/utils/decimal.util';

/**
 * Registro de un movimiento manual de entrada o salida (RF-58).
 *
 * Solo ofrece `entrada` y `salida`: los otros cuatro tipos del enum
 * (`ajuste_*`, `transferencia_*`) los genera el backend a partir de un ajuste o
 * de una transferencia, y mandarlos por aquí sería saltarse el registro que les
 * corresponde.
 *
 * La validación local de "cantidad ≥ 0" no sustituye a la del backend: quien
 * decide si una salida deja el stock en negativo es el servidor, que es el
 * único que conoce la existencia real en ese instante (→ 422).
 */
@Component({
  selector: 'app-movimiento-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent, EntityComboComponent],
  template: `
    <app-modal titulo="Nuevo movimiento" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <app-campo etiqueta="Tipo" paraId="tipo">
        <select id="tipo" class="campo-control" [value]="tipo()" (change)="cambiarTipo($event)">
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </app-campo>

      <app-entity-combo
        etiqueta="Producto"
        tipo="producto"
        [valor]="producto()"
        (valorChange)="producto.set($event)"
        marcador="Buscar por SKU o nombre…"
      />

      <app-entity-combo
        etiqueta="Almacén"
        tipo="almacen"
        [valor]="almacen()"
        (valorChange)="almacen.set($event)"
        marcador="Buscar almacén…"
      />

      <app-campo etiqueta="Cantidad" paraId="cantidad" [error]="errorCantidad()">
        <input
          id="cantidad"
          class="campo-control"
          inputmode="decimal"
          [value]="cantidad()"
          (input)="cantidad.set($any($event.target).value)"
        />
      </app-campo>

      <app-campo
        etiqueta="Costo unitario (opcional)"
        paraId="costo"
        [error]="errorDe('costo_unitario')"
      >
        <input
          id="costo"
          class="campo-control"
          inputmode="decimal"
          [value]="costoUnitario()"
          (input)="costoUnitario.set($any($event.target).value)"
        />
      </app-campo>

      @if (tipo() === 'salida') {
        <p
          class="rounded border border-outline-variant bg-warning-container px-3 py-2 text-body-sm text-on-warning-container"
        >
          Una salida se rechaza si dejaría la existencia por debajo de cero.
        </p>
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
          [disabled]="enviando() || !valido()"
          (click)="enviar()"
        >
          {{ enviando() ? 'Registrando…' : 'Registrar' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class MovimientoFormModal {
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<MovimientoCreate>();
  readonly cerrar = output<void>();

  protected readonly tipo = signal<'entrada' | 'salida'>('entrada');
  protected readonly producto = signal<OpcionCombo | null>(null);
  protected readonly almacen = signal<OpcionCombo | null>(null);
  protected readonly cantidad = signal('');
  protected readonly costoUnitario = signal('');

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly errorCantidad = computed(() => {
    const valor = this.cantidad().trim();
    if (valor !== '' && !isNonNegative(valor)) return 'Debe ser un número mayor o igual a 0.';
    return campoDeError(this.error()) === 'cantidad' ? mensajeDeError(this.error()) : '';
  });

  protected readonly valido = computed(
    () =>
      this.producto() !== null &&
      this.almacen() !== null &&
      isNonNegative(this.cantidad()) &&
      (this.costoUnitario().trim() === '' || isValidDecimal(this.costoUnitario())),
  );

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected cambiarTipo(evento: Event): void {
    this.tipo.set((evento.target as HTMLSelectElement).value as 'entrada' | 'salida');
  }

  protected enviar(): void {
    const producto = this.producto();
    const almacen = this.almacen();
    if (!producto || !almacen || !this.valido() || this.enviando()) return;

    const costo = this.costoUnitario().trim();
    this.guardar.emit({
      tipo: this.tipo(),
      producto_id: producto.id,
      almacen_id: almacen.id,
      cantidad: this.cantidad().trim(),
      // El campo es opcional: mandarlo vacío no es lo mismo que omitirlo.
      ...(costo === '' ? {} : { costo_unitario: costo }),
    });
  }
}
