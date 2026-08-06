import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Usuario, UsuarioCreate } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Roles que se ofrecen sin obligar a paginar. */
const MAX_ROLES = 100;

/**
 * Alta y edición de usuario por un administrador.
 *
 * Dos cosas que el formulario refleja del contrato:
 *
 * - **El alta exige al menos un rol.** No es un capricho de la UI: el backend
 *   lo rechaza, y un usuario sin rol no podría hacer nada al entrar.
 * - **Cambiar el correo tiene consecuencia.** Manda al usuario a
 *   `pendiente_verificacion` y le corta el acceso hasta que reconfirme. Se
 *   avisa antes de guardar, no después.
 *
 * Los roles solo se eligen al crear. Cambiarlos después es otro endpoint
 * (`/roles/`) con su propio permiso, y vive en su propio diálogo.
 */
@Component({
  selector: 'app-usuario-form-modal',
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
        <app-campo etiqueta="Nombre completo" paraId="nombre" [error]="errorDe('nombre_completo')">
          <input id="nombre" class="campo-control" formControlName="nombre_completo" />
        </app-campo>

        <app-campo
          etiqueta="Correo"
          paraId="correo"
          [error]="errorDe('correo')"
          [ayuda]="ayudaCorreo()"
        >
          <input id="correo" type="email" class="campo-control" formControlName="correo" />
        </app-campo>

        <div class="grid grid-cols-2 gap-3">
          <app-campo etiqueta="Teléfono" paraId="telefono" [error]="errorDe('telefono')">
            <input id="telefono" class="campo-control" formControlName="telefono" />
          </app-campo>

          <app-campo etiqueta="Puesto" paraId="puesto" [error]="errorDe('puesto')">
            <input id="puesto" class="campo-control" formControlName="puesto" />
          </app-campo>
        </div>

        <app-campo etiqueta="Departamento" paraId="departamento" [error]="errorDe('departamento')">
          <input id="departamento" class="campo-control" formControlName="departamento" />
        </app-campo>
      </form>

      @if (!usuario()) {
        <div class="flex flex-col gap-2">
          <p class="text-label-caps uppercase text-on-surface-variant">Roles (al menos uno)</p>

          @if (roles.isPending()) {
            <p class="text-body-sm text-on-surface-variant">Cargando roles…</p>
          } @else if (roles.isError()) {
            <p class="text-body-sm text-error">No se pudieron cargar los roles.</p>
          } @else {
            <div class="flex flex-col gap-1.5 rounded border border-outline-variant p-3">
              @for (rol of roles.data() ?? []; track rol.id) {
                <label class="flex items-center gap-2 text-body-sm text-on-surface">
                  <input
                    type="checkbox"
                    [checked]="tieneRol(rol.id)"
                    (change)="alternarRol(rol.id, $any($event.target).checked)"
                  />
                  {{ rol.nombre }}
                  @if (rol.acceso_total) {
                    <span class="text-label-md text-on-surface-variant">· acceso total</span>
                  }
                </label>
              } @empty {
                <p class="text-body-sm text-on-surface-variant">
                  No hay roles activos. Crea uno antes de dar de alta usuarios.
                </p>
              }
            </div>
          }

          @if (errorDe('roles'); as mensaje) {
            <p class="text-label-md text-error" role="alert">{{ mensaje }}</p>
          }
        </div>

        <p class="text-label-md text-on-surface-variant">
          El usuario nacerá pendiente y recibirá un código para fijar su contraseña. El segundo
          factor lo configurará en su primer inicio de sesión.
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
          {{ enviando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class UsuarioFormModal {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);

  readonly usuario = input<Usuario | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<UsuarioCreate>();
  readonly cerrar = output<void>();

  protected readonly seleccionados = signal<string[]>([]);

  protected readonly form = this.fb.group({
    nombre_completo: this.fb.control('', Validators.required),
    correo: this.fb.control('', [Validators.required, Validators.email]),
    telefono: this.fb.control(''),
    puesto: this.fb.control(''),
    departamento: this.fb.control(''),
  });

  protected readonly roles = injectQuery(() => {
    const filtros = { page_size: MAX_ROLES, activo: true };
    return {
      queryKey: qk.lista(this.store.tenantSlug() ?? '', 'roles', filtros),
      // Solo hacen falta al crear: al editar, los roles se cambian aparte.
      enabled: this.usuario() === null,
      queryFn: () => this.api.listarRoles(filtros).then((pagina) => pagina.results),
    };
  });

  protected readonly titulo = computed(() => {
    const existente = this.usuario();
    return existente ? `Editar ${existente.nombre_completo}` : 'Nuevo usuario';
  });

  protected readonly ayudaCorreo = computed(() =>
    this.usuario()
      ? 'Cambiarlo dejará al usuario sin acceso hasta que reconfirme el correo nuevo.'
      : 'Ahí llegará el código de activación.',
  );

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly valido = computed(
    () => this.form.valid && (this.usuario() !== null || this.seleccionados().length > 0),
  );

  constructor() {
    const existente = this.usuario();
    if (existente) {
      this.form.setValue({
        nombre_completo: existente.nombre_completo,
        correo: existente.correo,
        telefono: existente.telefono ?? '',
        puesto: existente.puesto ?? '',
        departamento: existente.departamento ?? '',
      });
    }
  }

  protected tieneRol(id: string): boolean {
    return this.seleccionados().includes(id);
  }

  protected alternarRol(id: string, marcado: boolean): void {
    this.seleccionados.update((actual) =>
      marcado ? [...actual, id] : actual.filter((rolId) => rolId !== id),
    );
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
    if (!this.valido() || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    this.guardar.emit({
      nombre_completo: valor.nombre_completo,
      correo: valor.correo.trim(),
      roles: this.seleccionados(),
      // Los opcionales solo viajan si tienen contenido: una cadena vacía
      // sobrescribiría el dato existente al editar.
      ...(valor.telefono.trim() === '' ? {} : { telefono: valor.telefono.trim() }),
      ...(valor.puesto.trim() === '' ? {} : { puesto: valor.puesto.trim() }),
      ...(valor.departamento.trim() === '' ? {} : { departamento: valor.departamento.trim() }),
    });
  }
}
