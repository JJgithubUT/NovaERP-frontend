import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Cliente, ClienteCreate } from '../../../api/models';
import { isApiError } from '../../../core/errors/api-error.model';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { decimalNoNegativo } from '../../../shared/forms/decimal.validator';
import { formatMoneda } from '../../../shared/utils/decimal.util';

/**
 * Alta y edición de cliente.
 *
 * El detalle propio de esta pantalla es la baja: el backend la rechaza con 422
 * si el cliente tiene saldo vivo en cuentas por cobrar, y manda cuánto en
 * `saldo_pendiente`. Ese número se muestra formateado, porque "no se puede dar
 * de baja" sin decir cuánto debe obliga al usuario a irse a buscarlo a otra
 * pantalla.
 */
@Component({
  selector: 'app-cliente-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, CampoComponent],
  template: `
    <app-modal [titulo]="titulo()" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <form [formGroup]="form" class="flex flex-col gap-4" (ngSubmit)="enviar()">
        <app-campo etiqueta="Razón social" paraId="razon" [error]="errorDe('razon_social')">
          <input id="razon" class="campo-control" formControlName="razon_social" />
        </app-campo>

        <app-campo
          etiqueta="RFC o id fiscal"
          paraId="rfc"
          [error]="errorDe('rfc_o_id_fiscal')"
          ayuda="Opcional, pero único por empresa si se informa."
        >
          <input id="rfc" class="campo-control" formControlName="rfc_o_id_fiscal" />
        </app-campo>

        <div class="grid grid-cols-2 gap-3">
          <app-campo etiqueta="Correo" paraId="correo" [error]="errorDe('correo')">
            <input id="correo" type="email" class="campo-control" formControlName="correo" />
          </app-campo>

          <app-campo etiqueta="Teléfono" paraId="telefono" [error]="errorDe('telefono')">
            <input id="telefono" class="campo-control" formControlName="telefono" />
          </app-campo>
        </div>

        <app-campo
          etiqueta="Límite de crédito"
          paraId="limite"
          [error]="errorDe('limite_credito')"
          ayuda="Confirmar un pedido que lo supere exige autorización de crédito."
        >
          <input
            id="limite"
            class="campo-control"
            inputmode="decimal"
            formControlName="limite_credito"
          />
        </app-campo>
      </form>

      <div footer class="flex w-full items-center gap-2">
        @if (cliente(); as existente) {
          <button
            type="button"
            class="btn btn-peligro mr-auto"
            [disabled]="enviando()"
            (click)="darDeBaja.emit(existente)"
          >
            Dar de baja
          </button>
        }
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
          [disabled]="enviando() || form.invalid"
          (click)="enviar()"
        >
          {{ enviando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ClienteFormModal implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly cliente = input<Cliente | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<ClienteCreate>();
  readonly darDeBaja = output<Cliente>();
  readonly cerrar = output<void>();

  protected readonly form = this.fb.group({
    razon_social: this.fb.control('', Validators.required),
    rfc_o_id_fiscal: this.fb.control(''),
    correo: this.fb.control('', Validators.email),
    telefono: this.fb.control(''),
    limite_credito: this.fb.control('0', decimalNoNegativo),
  });

  protected readonly titulo = computed(() => {
    const existente = this.cliente();
    return existente ? `Editar ${existente.razon_social}` : 'Nuevo cliente';
  });

  /**
   * Banner general. Si el 422 vino con `saldo_pendiente` (la guarda de la
   * baja), se añade el importe: el mensaje solo dice que no se puede, no
   * cuánto falta por cobrar.
   */
  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;

    const mensaje = mensajeDeError(error);
    const saldo = isApiError(error) ? error.extra['saldo_pendiente'] : undefined;

    return typeof saldo === 'string'
      ? `${mensaje} Saldo pendiente: ${formatMoneda(saldo)}.`
      : mensaje;
  });

  /**
   * Los valores de los `input()` se asignan DESPUÉS de construir el componente,
   * así que esto no puede vivir en el constructor: ahí el input todavía vale
   * `null` y el formulario se quedaba vacío al editar.
   */
  ngOnInit(): void {
    const existente = this.cliente();
    if (existente) {
      this.form.setValue({
        razon_social: existente.razon_social,
        rfc_o_id_fiscal: existente.rfc_o_id_fiscal ?? '',
        correo: existente.correo ?? '',
        telefono: existente.telefono ?? '',
        limite_credito: existente.limite_credito,
      });
    }
  }

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched) {
      if (control.hasError('required')) return 'Este campo es obligatorio.';
      if (control.hasError('email')) return 'Correo no válido.';
      if (control.hasError('decimal')) return 'Debe ser un número mayor o igual a 0.';
    }
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    this.guardar.emit({
      razon_social: valor.razon_social,
      // Los opcionales van como `null` y no como `''`: el backend distingue
      // "sin dato" de "cadena vacía" al comprobar la unicidad del RFC.
      rfc_o_id_fiscal: valor.rfc_o_id_fiscal.trim() || null,
      correo: valor.correo.trim() || null,
      telefono: valor.telefono.trim() || null,
      limite_credito: valor.limite_credito,
    });
  }
}
