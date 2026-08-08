import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { SuspenderTenant, Tenant, TipoSuspension } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { TIPOS_SUSPENSION } from '../plataforma.labels';

/**
 * Suspensión y baja lógica de una organización (RF-04).
 *
 * Es la acción de mayor consecuencia del portal: cierra **todas** las sesiones
 * activas de la organización en el acto y bloquea su acceso a la API. Por eso el
 * aviso dice qué le pasa a la gente que está dentro ahora mismo, con el número de
 * usuarios afectados, en vez de un «¿estás seguro?».
 *
 * Lo que no hace, y también conviene decirlo: no borra información. Ni la
 * suspensión ni la baja son destructivas, y las dos se revierten reactivando.
 *
 * El motivo es obligatorio en el backend, no un adorno: queda en la bitácora de
 * plataforma y se muestra en el detalle mientras el estado dure.
 */
@Component({
  selector: 'app-suspender-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, CampoComponent, IconComponent],
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

      <div
        class="flex flex-col gap-2 rounded border border-error bg-error-container px-3 py-3 text-on-error-container"
      >
        <p class="flex items-center gap-1.5 text-body-sm font-semibold">
          <app-icon name="warning" [size]="14" />
          Efecto inmediato
        </p>
        <p class="text-body-sm">
          Se cierran <strong>todas</strong> las sesiones activas de la organización y se bloquea su
          acceso a la API. No se borra información y la acción es reversible.
        </p>
      </div>

      <p class="text-body-sm text-on-surface-variant">
        {{ tenant().razon_social }} · {{ tenant().slug }}
        @if (usuariosAfectados() > 0) {
          · afecta a {{ usuariosAfectados() }}
          {{ usuariosAfectados() === 1 ? 'usuario' : 'usuarios' }} con licencia activa
        }
      </p>

      <form [formGroup]="form" class="flex flex-col gap-4" (ngSubmit)="enviar()">
        <app-campo etiqueta="Tipo" paraId="tipo" [ayuda]="ayudaTipo()" [error]="errorDe('tipo')">
          <select id="tipo" class="campo-control" formControlName="tipo">
            @for (tipo of tipos; track tipo.valor) {
              <option [value]="tipo.valor">{{ tipo.label }}</option>
            }
          </select>
        </app-campo>

        <app-campo
          etiqueta="Motivo"
          paraId="motivo"
          [error]="errorDe('motivo')"
          ayuda="Queda en la bitácora de plataforma y se muestra en el detalle de la organización."
        >
          <textarea
            id="motivo"
            rows="3"
            class="campo-control"
            placeholder="Ej. Impago de la suscripción desde el ciclo de julio."
            formControlName="motivo"
          ></textarea>
        </app-campo>
      </form>

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
          class="btn btn-peligro"
          [disabled]="enviando() || form.invalid"
          (click)="enviar()"
        >
          {{ enviando() ? 'Aplicando…' : etiquetaAccion() }}
        </button>
      </div>
    </app-modal>
  `,
})
export class SuspenderModal {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly tenant = input.required<Tenant>();
  /** `true` = baja lógica; `false` = suspensión. Mismo endpoint, distinto destino. */
  readonly baja = input(false);
  /** Solo lo trae el detalle; en el listado no viene y el aviso lo omite. */
  readonly usuariosAfectados = input(0);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<SuspenderTenant>();
  readonly cerrar = output<void>();

  protected readonly tipos = TIPOS_SUSPENSION;

  protected readonly form = this.fb.group({
    tipo: this.fb.control<TipoSuspension>('administrativa', Validators.required),
    motivo: this.fb.control('', [Validators.required, Validators.minLength(1)]),
  });

  private readonly valores = toSignal(this.form.valueChanges, { initialValue: null });

  protected readonly etiquetaAccion = computed(() => (this.baja() ? 'Dar de baja' : 'Suspender'));

  protected readonly titulo = computed(() => `${this.etiquetaAccion()} organización`);

  protected readonly ayudaTipo = computed(() => {
    this.valores();
    const elegido = this.form.getRawValue().tipo;
    return TIPOS_SUSPENSION.find((tipo) => tipo.valor === elegido)?.ayuda ?? '';
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched && control.hasError('required')) return 'Este campo es obligatorio.';
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (this.enviando()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const valor = this.form.getRawValue();
    this.guardar.emit({ tipo: valor.tipo, motivo: valor.motivo.trim() });
  }
}
