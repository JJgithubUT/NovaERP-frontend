import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Proveedor, ProveedorCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/**
 * Alta y edición de proveedor (FLUJO-COMPRAS §2).
 *
 * A diferencia del cliente, el `rfc_o_id_fiscal` es **obligatorio** (NOT NULL en
 * la base) y único por tenant. Y la baja no tiene guarda de deuda: se puede dar
 * de baja aunque queden cuentas por pagar abiertas, que se conservan.
 */
@Component({
  selector: 'app-proveedor-form-modal',
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
          ayuda="Obligatorio y único por empresa."
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
      </form>

      <div footer class="flex w-full items-center gap-2">
        @if (proveedor(); as existente) {
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
export class ProveedorFormModal {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly proveedor = input<Proveedor | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<ProveedorCreate>();
  readonly darDeBaja = output<Proveedor>();
  readonly cerrar = output<void>();

  protected readonly form = this.fb.group({
    razon_social: this.fb.control('', Validators.required),
    rfc_o_id_fiscal: this.fb.control('', Validators.required),
    correo: this.fb.control('', Validators.email),
    telefono: this.fb.control(''),
  });

  protected readonly titulo = computed(() => {
    const existente = this.proveedor();
    return existente ? `Editar ${existente.razon_social}` : 'Nuevo proveedor';
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  constructor() {
    const existente = this.proveedor();
    if (existente) {
      this.form.setValue({
        razon_social: existente.razon_social,
        rfc_o_id_fiscal: existente.rfc_o_id_fiscal,
        correo: existente.correo ?? '',
        telefono: existente.telefono ?? '',
      });
    }
  }

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched) {
      if (control.hasError('required')) return 'Este campo es obligatorio.';
      if (control.hasError('email')) return 'Correo no válido.';
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
      rfc_o_id_fiscal: valor.rfc_o_id_fiscal,
      correo: valor.correo.trim() || null,
      telefono: valor.telefono.trim() || null,
    });
  }
}
