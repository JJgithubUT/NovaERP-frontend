import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { PlanCatalogo, TenantDetalle, TenantUpdate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CatalogoPlataforma } from '../../../core/plataforma/catalogo.store';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/**
 * Edición de datos generales y plan (RF-03).
 *
 * Solo manda **lo que cambió**: un PATCH sin cambios se rechaza con 422, así que
 * el botón queda deshabilitado mientras el formulario esté igual que el original.
 *
 * Bajar de plan está permitido y no borra nada, pero tiene dos consecuencias que
 * se avisan antes de confirmar, no después:
 *
 * - Si el consumo de licencias supera el techo nuevo, los usuarios se quedan
 *   —no se suspende a nadie— pero no se pueden dar de alta más hasta bajar de él.
 * - Los módulos activos que el plan nuevo no incluya siguen encendidos, pero ya
 *   no se podrán volver a activar si se apagan.
 *
 * El plan contratado puede estar retirado del catálogo. En ese caso se mantiene
 * como opción para no forzar un cambio de plan por el mero hecho de abrir este
 * diálogo; si se cambia, no hay vuelta atrás.
 */
@Component({
  selector: 'app-editar-organizacion-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, CampoComponent],
  template: `
    <app-modal [titulo]="'Editar ' + tenant().razon_social" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <form [formGroup]="form" class="flex flex-col gap-4" (ngSubmit)="enviar()">
        <app-campo etiqueta="Razón social" paraId="razon_social" [error]="errorDe('razon_social')">
          <input id="razon_social" class="campo-control" formControlName="razon_social" />
        </app-campo>

        <app-campo
          etiqueta="Giro o nombre comercial"
          paraId="dominio_comercial"
          [error]="errorDe('dominio_comercial')"
        >
          <input id="dominio_comercial" class="campo-control" formControlName="dominio_comercial" />
        </app-campo>

        <app-campo
          etiqueta="Dominio comercial"
          paraId="slug"
          ayuda="Inmutable: es la llave con la que los usuarios inician sesión."
        >
          <input id="slug" class="campo-control font-mono" [value]="tenant().slug" disabled />
        </app-campo>

        <app-campo etiqueta="Plan contratado" paraId="plan" [error]="errorDe('plan')">
          <select id="plan" class="campo-control" formControlName="plan">
            @for (plan of opcionesPlan(); track plan.codigo) {
              <option [value]="plan.codigo">
                {{ plan.nombre }} — hasta {{ plan.licencias_max }} licencias{{
                  plan.activo ? '' : ' (plan retirado)'
                }}
              </option>
            }
          </select>
        </app-campo>
      </form>

      @if (enPlanRetirado()) {
        <p
          class="rounded border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant"
        >
          Esta organización sigue contratada en un plan que ya no se ofrece. Puede quedarse así; si
          lo cambias, no hay vuelta atrás a un plan retirado.
        </p>
      }

      @if (excedente() > 0) {
        <p
          class="rounded border border-warning bg-warning-container px-3 py-2.5 text-body-sm text-on-warning-container"
        >
          Tiene {{ tenant().usuarios.licencias_consumidas }} licencias consumidas y el plan nuevo
          topa en {{ planNuevo()?.licencias_max }}. El cambio no borra usuarios: quedarán
          <strong>{{ excedente() }}</strong> por encima del techo y no se podrán dar de alta más
          hasta bajar de él.
        </p>
      }

      @if (fueraDelPlanNuevo().length > 0) {
        <p
          class="rounded border border-warning bg-warning-container px-3 py-2.5 text-body-sm text-on-warning-container"
        >
          Estos módulos activos no están incluidos en el plan nuevo:
          <strong>{{ fueraDelPlanNuevo().join(', ') }}</strong
          >. Seguirán encendidos, pero no podrás volver a activarlos si los apagas.
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
          [disabled]="enviando() || form.invalid || sinCambios()"
          (click)="enviar()"
        >
          {{ enviando() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class EditarOrganizacionModal implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogo = inject(CatalogoPlataforma);

  readonly tenant = input.required<TenantDetalle>();
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<TenantUpdate>();
  readonly cerrar = output<void>();

  protected readonly form = this.fb.group({
    razon_social: this.fb.control('', Validators.required),
    dominio_comercial: this.fb.control(''),
    plan: this.fb.control('', Validators.required),
  });

  /**
   * Los valores de los `input()` se asignan **después** del constructor, así que
   * el prellenado va en `ngOnInit`: hacerlo en el constructor dejaría el
   * formulario vacío al editar.
   */
  ngOnInit(): void {
    const tenant = this.tenant();
    this.form.setValue({
      razon_social: tenant.razon_social,
      dominio_comercial: tenant.dominio_comercial,
      plan: tenant.plan.codigo,
    });
  }

  /** `valueChanges` como signal: sin esto los avisos no reaccionarían al cambio. */
  private readonly valores = toSignal(this.form.valueChanges, { initialValue: null });

  private readonly planContratado = computed(() => this.catalogo.plan(this.tenant().plan.codigo));

  protected readonly enPlanRetirado = computed(() => {
    const plan = this.planContratado();
    return plan !== null && !plan.activo && this.cambios().plan === undefined;
  });

  protected readonly opcionesPlan = computed<readonly PlanCatalogo[]>(() => {
    const contratado = this.planContratado();
    const vigentes = this.catalogo.planesVigentes();
    // Un plan retirado no está entre los vigentes: sin añadirlo, el `<select>`
    // no tendría opción que corresponda al valor actual del control.
    return contratado && !contratado.activo ? [contratado, ...vigentes] : vigentes;
  });

  protected readonly planNuevo = computed(() => {
    this.valores();
    return this.catalogo.plan(this.form.getRawValue().plan);
  });

  /** Solo se manda lo que cambió: el backend rechaza un PATCH vacío. */
  protected readonly cambios = computed<TenantUpdate>(() => {
    this.valores();
    const tenant = this.tenant();
    const valor = this.form.getRawValue();
    const cambios: TenantUpdate = {};

    if (valor.razon_social.trim() !== tenant.razon_social) {
      cambios.razon_social = valor.razon_social.trim();
    }
    if (valor.dominio_comercial.trim() !== tenant.dominio_comercial) {
      cambios.dominio_comercial = valor.dominio_comercial.trim();
    }
    if (valor.plan && valor.plan !== tenant.plan.codigo) {
      cambios.plan = valor.plan;
    }

    return cambios;
  });

  protected readonly sinCambios = computed(() => Object.keys(this.cambios()).length === 0);

  /** Licencias que quedarían por encima del techo del plan nuevo. */
  protected readonly excedente = computed(() => {
    const plan = this.planNuevo();
    if (this.cambios().plan === undefined || !plan) return 0;
    return this.tenant().usuarios.licencias_consumidas - plan.licencias_max;
  });

  protected readonly fueraDelPlanNuevo = computed(() => {
    const nuevo = this.cambios().plan;
    if (!nuevo) return [];
    return this.tenant()
      .modulos_activos.filter((modulo) => !this.catalogo.planIncluye(nuevo, modulo.codigo))
      .map((modulo) => modulo.nombre);
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
    if (this.enviando() || this.sinCambios()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.guardar.emit(this.cambios());
  }
}
