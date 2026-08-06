import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { injectMutation } from '@tanstack/angular-query-experimental';
import type { UsuarioUpdate } from '../../api/models';
import { CoreApi } from '../../api/services/core.api';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { CampoComponent } from '../../shared/ui/campo/campo.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { formatFechaHora } from '../../shared/utils/fecha.util';
import { ESTADO_USUARIO_LABEL, tonoUsuario } from '../administracion/administracion.labels';

/**
 * Mis datos personales.
 *
 * El propietario solo puede cambiar **nombre y teléfono**: cualquier otro campo
 * en el PATCH devuelve 422 aunque el formulario lo mandara (FLUJO-USUARIOS §5).
 * Por eso correo, puesto y departamento se muestran como lectura, con la nota
 * de a quién hay que pedirle el cambio — un campo deshabilitado sin explicación
 * solo genera un ticket de soporte.
 */
@Component({
  selector: 'app-perfil-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BadgeComponent, CampoComponent],
  template: `
    <div class="flex max-w-2xl flex-col gap-5">
      @if (store.usuario(); as usuario) {
        <div
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-5"
        >
          <div>
            <p class="text-headline-sm text-on-surface">{{ usuario.nombre_completo }}</p>
            <p class="font-mono text-body-sm text-on-surface-variant">{{ usuario.correo }}</p>
          </div>

          <div class="flex flex-col items-end gap-1">
            <app-badge [tono]="tono(usuario.estado)">
              {{ etiquetaEstado(usuario.estado) }}
            </app-badge>
            <span class="text-label-md text-on-surface-variant">
              Segundo factor: {{ usuario.mfa_enrolado ? 'configurado' : 'sin configurar' }}
            </span>
            @if (usuario.ultimo_acceso) {
              <span class="text-label-md text-on-surface-variant">
                Último acceso: {{ fechaHora(usuario.ultimo_acceso) }}
              </span>
            }
          </div>
        </div>

        <div
          class="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-5"
        >
          @if (errorGeneral(); as mensaje) {
            <p
              class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
              role="alert"
            >
              {{ mensaje }}
            </p>
          }

          <form [formGroup]="form" class="flex flex-col gap-4" (ngSubmit)="guardar()">
            <app-campo
              etiqueta="Nombre completo"
              paraId="nombre"
              [error]="errorDe('nombre_completo')"
            >
              <input id="nombre" class="campo-control" formControlName="nombre_completo" />
            </app-campo>

            <app-campo
              etiqueta="Teléfono"
              paraId="telefono"
              [error]="errorDe('telefono')"
              ayuda="Escribe un número para actualizarlo. Si lo dejas en blanco, se conserva el que ya tuvieras."
            >
              <input id="telefono" class="campo-control" formControlName="telefono" />
            </app-campo>
          </form>

          <button
            type="button"
            class="btn btn-primario self-start"
            [disabled]="guardado.isPending() || form.invalid"
            (click)="guardar()"
          >
            {{ guardado.isPending() ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>

        <div class="rounded-lg border border-outline-variant bg-surface-container-low p-5">
          <h2 class="text-label-caps uppercase text-on-surface-variant">
            Datos de la organización
          </h2>
          <p class="mt-1 text-body-sm text-on-surface-variant">
            Estos campos los gestiona un administrador. Si algo no es correcto, pídeselo a quien
            administre tu empresa.
          </p>

          <dl class="mt-4 flex flex-col gap-1">
            <div class="flex justify-between gap-3 border-b border-outline-variant py-2">
              <dt class="text-body-sm text-on-surface-variant">Correo</dt>
              <dd class="font-mono text-body-sm">{{ usuario.correo }}</dd>
            </div>
            <div class="flex justify-between gap-3 border-b border-outline-variant py-2">
              <dt class="text-body-sm text-on-surface-variant">Empresa</dt>
              <dd class="text-body-sm">{{ store.tenant()?.razon_social }}</dd>
            </div>
            <div class="flex justify-between gap-3 py-2">
              <dt class="text-body-sm text-on-surface-variant">Roles</dt>
              <dd class="text-body-sm">{{ roles() }}</dd>
            </div>
          </dl>
        </div>
      }
    </div>
  `,
})
export class PerfilPage {
  protected readonly store = inject(AuthStore);
  private readonly api = inject(CoreApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toasts = inject(ToastService);

  protected readonly form = this.fb.group({
    nombre_completo: this.fb.control('', Validators.required),
    telefono: this.fb.control(''),
  });

  private readonly sembrado = signal(false);

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: UsuarioUpdate) => this.api.editarUsuario(this.store.usuarioId()!, datos),
    onSuccess: async () => {
      this.toasts.exito('Datos actualizados.');
      // El nombre se pinta en el shell desde el `me` cacheado: sin recargarlo,
      // la cabecera seguiría mostrando el anterior hasta el próximo arranque.
      await this.auth.loadMe();
    },
    onError: (error: unknown) => {
      if (!campoDeError(error)) this.toasts.error(mensajeDeError(error));
    },
  }));

  protected readonly errorGeneral = computed(() => {
    const error = this.guardado.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly roles = computed(() => this.store.roles().join(' · ') || '—');

  protected readonly fechaHora = formatFechaHora;
  protected readonly tono = tonoUsuario;

  constructor() {
    const usuario = this.store.usuario();
    if (usuario && !this.sembrado()) {
      this.form.setValue({
        nombre_completo: usuario.nombre_completo,
        telefono: '',
      });
      this.sembrado.set(true);
    }
  }

  protected etiquetaEstado(estado: Parameters<typeof tonoUsuario>[0]): string {
    return ESTADO_USUARIO_LABEL[estado];
  }

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched && control.hasError('required')) return 'Este campo es obligatorio.';
    return campoDeError(this.guardado.error()) === campo
      ? mensajeDeError(this.guardado.error())
      : '';
  }

  protected guardar(): void {
    if (this.form.invalid || this.guardado.isPending()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const telefono = valor.telefono.trim();

    this.guardado.mutate({
      nombre_completo: valor.nombre_completo,
      // El teléfono solo viaja si se escribió algo.
      //
      // `/api/core/me/` no devuelve `telefono`, así que el campo arranca vacío
      // aunque el usuario tenga uno guardado. Mandar esa cadena vacía lo
      // borraría sin que nadie lo pidiera. Es una limitación del contrato: no
      // hay forma de leer el propio teléfono sin permiso sobre el directorio.
      ...(telefono === '' ? {} : { telefono }),
    });
  }
}
