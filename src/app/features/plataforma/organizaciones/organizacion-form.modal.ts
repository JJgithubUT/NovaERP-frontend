import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { TenantCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CatalogoPlataforma } from '../../../core/plataforma/catalogo.store';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/**
 * Alta de organización (RF-01).
 *
 * Dos cosas del contrato que el formulario refleja:
 *
 * - **El entorno nace `pendiente`.** No queda operativo al crearlo: se activa
 *   cuando el administrador inicial canjea su enlace y fija su contraseña. Nadie
 *   más puede entrar antes de eso, así que conviene decirlo aquí y no dejar que
 *   se descubra viendo el estado en el listado.
 * - **El dominio comercial es inmutable.** Es la llave con la que los usuarios
 *   inician sesión y no se puede cambiar después, de modo que la ayuda lo avisa
 *   mientras todavía se está escribiendo.
 *
 * El selector de planes solo ofrece los vigentes: un plan retirado se rechaza
 * con 422. La validación del slug (forma y palabra reservada) sale del catálogo
 * del servidor, así que no puede desincronizarse de lo que valida el backend.
 */
@Component({
  selector: 'app-organizacion-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, CampoComponent],
  template: `
    <app-modal titulo="Nueva organización" ancho="lg" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <p
        class="rounded border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant"
      >
        El entorno nace <strong class="text-on-surface">pendiente</strong>. Se activa cuando el
        administrador inicial canjea el enlace de activación y define su contraseña; hasta entonces
        nadie puede iniciar sesión.
      </p>

      <form [formGroup]="form" class="flex flex-col gap-4" (ngSubmit)="enviar()">
        <app-campo etiqueta="Razón social" paraId="razon_social" [error]="errorDe('razon_social')">
          <input
            id="razon_social"
            class="campo-control"
            placeholder="ACME Corp S.A. de C.V."
            formControlName="razon_social"
          />
        </app-campo>

        <app-campo
          etiqueta="Dominio comercial"
          paraId="slug"
          [error]="errorDe('slug')"
          ayuda="Minúsculas, dígitos y guion. Único en toda la plataforma y no se puede cambiar después."
        >
          <input
            id="slug"
            class="campo-control font-mono"
            placeholder="acme"
            formControlName="slug"
          />
        </app-campo>

        <app-campo
          etiqueta="Giro o nombre comercial"
          paraId="dominio_comercial"
          [error]="errorDe('dominio_comercial')"
          ayuda="Texto libre. Si lo dejas vacío se usa la razón social."
        >
          <input
            id="dominio_comercial"
            class="campo-control"
            placeholder="Manufactura"
            formControlName="dominio_comercial"
          />
        </app-campo>

        <app-campo etiqueta="Plan contratado" paraId="plan" [error]="errorDe('plan')">
          <select id="plan" class="campo-control" formControlName="plan">
            @for (plan of catalogo.planesVigentes(); track plan.codigo) {
              <option [value]="plan.codigo">
                {{ plan.nombre }} — hasta {{ plan.licencias_max }} licencias
              </option>
            }
          </select>
        </app-campo>
      </form>

      @if (planElegido(); as plan) {
        <div class="rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
          <p class="text-label-caps uppercase text-on-surface-variant">
            El plan {{ plan.nombre }} habilita {{ plan.modulos.length }} módulos
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            @for (codigo of plan.modulos; track codigo) {
              <span
                class="rounded border border-outline-variant bg-surface-container-lowest px-1.5 py-0.5 text-label-md text-on-surface-variant"
              >
                {{ catalogo.nombreModulo(codigo) }}
              </span>
            }
          </div>
        </div>
      }

      <hr class="border-outline-variant" />

      <p class="text-label-caps uppercase text-on-surface-variant">Administrador inicial</p>

      <form [formGroup]="form" class="flex flex-col gap-4">
        <app-campo
          etiqueta="Nombre completo"
          paraId="nombre_completo"
          [error]="errorDe('nombre_completo')"
        >
          <input
            id="nombre_completo"
            class="campo-control"
            placeholder="Ana Torres"
            formControlName="nombre_completo"
          />
        </app-campo>

        <app-campo
          etiqueta="Correo"
          paraId="correo"
          [error]="errorDe('correo')"
          ayuda="No puede estar en uso por ningún usuario de la plataforma, ni en otra organización."
        >
          <input
            id="correo"
            type="email"
            class="campo-control"
            placeholder="ana@acme.com"
            formControlName="correo"
          />
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
          class="btn btn-primario"
          [disabled]="enviando() || form.invalid"
          (click)="enviar()"
        >
          {{ enviando() ? 'Creando…' : 'Crear organización' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class OrganizacionFormModal {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly catalogo = inject(CatalogoPlataforma);

  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<TenantCreate>();
  readonly cerrar = output<void>();

  protected readonly form = this.fb.group({
    razon_social: this.fb.control('', Validators.required),
    slug: this.fb.control('', Validators.required),
    dominio_comercial: this.fb.control(''),
    // El catálogo llega ordenado del más chico al más grande, así que el primer
    // plan vigente es el más conservador: buen valor por defecto.
    plan: this.fb.control(this.catalogo.planesVigentes()[0]?.codigo ?? '', Validators.required),
    nombre_completo: this.fb.control('', Validators.required),
    correo: this.fb.control('', [Validators.required, Validators.email]),
  });

  /**
   * El valor del control no es un signal, así que un `computed` sobre
   * `getRawValue()` nunca se recalcularía: la vista previa de módulos se quedaría
   * clavada en el plan inicial. `toSignal` sobre `valueChanges` la vuelve a
   * hacer reactiva.
   */
  private readonly planActual = toSignal(this.form.controls.plan.valueChanges, {
    initialValue: this.form.controls.plan.value,
  });

  protected readonly planElegido = computed(() => this.catalogo.plan(this.planActual()));

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched) {
      if (control.hasError('required')) return 'Este campo es obligatorio.';
      if (control.hasError('email')) return 'Correo no válido.';
    }

    // Forma del slug y palabra reservada, con la lista del catálogo. Se
    // comprueba aquí y no como validador para poder decir cuál de las dos
    // reglas falló, que es lo que el backend también distingue.
    if (campo === 'slug' && control?.touched) {
      const problema = this.catalogo.validarSlug(this.slugNormalizado());
      if (problema) return problema;
    }

    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (this.enviando()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid || this.catalogo.validarSlug(this.slugNormalizado()) !== null) return;

    const valor = this.form.getRawValue();
    this.guardar.emit({
      slug: this.slugNormalizado(),
      razon_social: valor.razon_social.trim(),
      dominio_comercial: valor.dominio_comercial.trim(),
      plan: valor.plan,
      nombre_completo: valor.nombre_completo.trim(),
      correo: valor.correo.trim(),
    });
  }

  private slugNormalizado(): string {
    return this.form.getRawValue().slug.trim().toLowerCase();
  }
}
