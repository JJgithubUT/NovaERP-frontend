import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { AjusteCreate, MotivoAjuste } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';
import { MOTIVOS_AJUSTE, MOTIVO_AJUSTE_LABEL } from '../inventario.labels';

/**
 * Ajuste de inventario por conteo físico o merma (RF-60).
 *
 * A diferencia de un movimiento, la cantidad **lleva signo**: positiva suma
 * existencia, negativa la resta. Cero se rechaza porque un ajuste que no ajusta
 * nada no es un hecho que valga la pena registrar en el kardex.
 */
@Component({
  selector: 'app-ajuste-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent, EntityComboComponent],
  template: `
    <app-modal titulo="Nuevo ajuste" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <app-campo etiqueta="Motivo" paraId="motivo">
        <select
          id="motivo"
          class="campo-control"
          [value]="motivo()"
          (change)="cambiarMotivo($event)"
        >
          @for (valor of motivos; track valor) {
            <option [value]="valor">{{ etiquetaMotivo(valor) }}</option>
          }
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

      <app-campo
        etiqueta="Cantidad"
        paraId="cantidad"
        [error]="errorCantidad()"
        ayuda="Positiva suma existencia, negativa la resta. No puede ser cero."
      >
        <input
          id="cantidad"
          class="campo-control"
          inputmode="text"
          placeholder="Ej. -3 o 12.5"
          [value]="cantidad()"
          (input)="cantidad.set($any($event.target).value)"
        />
      </app-campo>

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
          {{ enviando() ? 'Aplicando…' : 'Aplicar ajuste' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class AjusteFormModal {
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<AjusteCreate>();
  readonly cerrar = output<void>();

  protected readonly motivos = MOTIVOS_AJUSTE;

  protected readonly motivo = signal<MotivoAjuste>('conteo_fisico');
  protected readonly producto = signal<OpcionCombo | null>(null);
  protected readonly almacen = signal<OpcionCombo | null>(null);
  protected readonly cantidad = signal('');

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly errorCantidad = computed(() => {
    const valor = this.cantidad().trim();
    if (valor !== '') {
      if (!isValidDecimal(valor)) return 'Debe ser un número válido.';
      if (toDecimal(valor).eq(0)) return 'Un ajuste de cero no altera nada.';
    }
    return campoDeError(this.error()) === 'cantidad' ? mensajeDeError(this.error()) : '';
  });

  protected readonly valido = computed(() => {
    const valor = this.cantidad().trim();
    return (
      this.producto() !== null &&
      this.almacen() !== null &&
      isValidDecimal(valor) &&
      !toDecimal(valor).eq(0)
    );
  });

  protected etiquetaMotivo(motivo: MotivoAjuste): string {
    return MOTIVO_AJUSTE_LABEL[motivo];
  }

  protected cambiarMotivo(evento: Event): void {
    this.motivo.set((evento.target as HTMLSelectElement).value as MotivoAjuste);
  }

  protected enviar(): void {
    const producto = this.producto();
    const almacen = this.almacen();
    if (!producto || !almacen || !this.valido() || this.enviando()) return;

    this.guardar.emit({
      motivo: this.motivo(),
      producto_id: producto.id,
      almacen_id: almacen.id,
      cantidad: this.cantidad().trim(),
    });
  }
}
