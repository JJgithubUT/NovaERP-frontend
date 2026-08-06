import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { Factura, NotaCreditoCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { formatMoneda, isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';

/**
 * Nota de crédito sobre una factura emitida (FLUJO-VENTAS §5).
 *
 * Es la **única** corrección posible: una factura no se edita ni se borra por
 * integridad fiscal. El monto no puede pasar del saldo vivo de la cuenta por
 * cobrar, y eso se comprueba aquí para no gastar un 422 en algo que ya se sabe.
 *
 * `reingresar_stock` solo tiene efecto en una nota **total**, así que la casilla
 * aparece únicamente cuando el monto iguala al saldo: ofrecerla en una parcial
 * prometería algo que el backend no va a hacer.
 */
@Component({
  selector: 'app-nota-credito-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent],
  template: `
    <app-modal [titulo]="'Nota de crédito · ' + factura().folio" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <dl class="grid grid-cols-2 gap-2 rounded border border-outline-variant p-3 text-body-sm">
        <dt class="text-on-surface-variant">Total facturado</dt>
        <dd class="text-right font-mono tabular-nums">{{ moneda(factura().total) }}</dd>
        <dt class="text-on-surface-variant">Saldo por cobrar</dt>
        <dd class="text-right font-mono font-bold tabular-nums">{{ saldoTexto() }}</dd>
      </dl>

      <app-campo etiqueta="Motivo" paraId="motivo" [error]="errorDe('motivo')">
        <input
          id="motivo"
          class="campo-control"
          [value]="motivo()"
          (input)="motivo.set($any($event.target).value)"
        />
      </app-campo>

      <app-campo
        etiqueta="Monto"
        paraId="monto"
        [error]="errorMonto()"
        ayuda="Mayor que cero y no superior al saldo por cobrar."
      >
        <input
          id="monto"
          class="campo-control"
          inputmode="decimal"
          [value]="monto()"
          (input)="monto.set($any($event.target).value)"
        />
      </app-campo>

      @if (esTotal()) {
        <label class="flex items-center gap-2 text-body-sm text-on-surface">
          <input
            type="checkbox"
            [checked]="reingresar()"
            (change)="reingresar.set($any($event.target).checked)"
          />
          Reingresar el stock facturado al inventario
        </label>
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
          {{ enviando() ? 'Emitiendo…' : 'Emitir nota de crédito' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class NotaCreditoModal {
  readonly factura = input.required<Factura>();
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly confirmar = output<NotaCreditoCreate>();
  readonly cerrar = output<void>();

  protected readonly motivo = signal('');
  protected readonly monto = signal('');
  protected readonly reingresar = signal(false);

  /** Sin CxC (`null`) no hay nada que acreditar. */
  private readonly saldo = computed(() => this.factura().cxc_saldo);

  protected readonly saldoTexto = computed(() => {
    const saldo = this.saldo();
    return saldo === null ? 'Sin cuenta por cobrar' : formatMoneda(saldo);
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly errorMonto = computed(() => {
    const valor = this.monto().trim();
    if (valor !== '') {
      if (!isValidDecimal(valor)) return 'Debe ser un número válido.';
      if (toDecimal(valor).lte(0)) return 'Debe ser mayor que cero.';

      const saldo = this.saldo();
      if (saldo !== null && toDecimal(valor).gt(toDecimal(saldo))) {
        return `No puede superar el saldo por cobrar (${formatMoneda(saldo)}).`;
      }
    }
    return campoDeError(this.error()) === 'monto' ? mensajeDeError(this.error()) : '';
  });

  /** Total = el monto agota el saldo. Solo entonces cabe reingresar stock. */
  protected readonly esTotal = computed(() => {
    const saldo = this.saldo();
    const valor = this.monto().trim();
    if (saldo === null || valor === '' || !isValidDecimal(valor)) return false;
    return toDecimal(valor).eq(toDecimal(saldo));
  });

  protected readonly valido = computed(
    () => this.motivo().trim() !== '' && this.monto().trim() !== '' && this.errorMonto() === '',
  );

  protected readonly moneda = formatMoneda;

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    this.confirmar.emit({
      motivo: this.motivo().trim(),
      monto: this.monto().trim(),
      ...(this.esTotal() && this.reingresar() ? { reingresar_stock: true } : {}),
    });
  }
}
