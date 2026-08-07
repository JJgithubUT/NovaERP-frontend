import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Rol, RolCreate } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SelectorPermisosComponent } from './selector-permisos.component';

/**
 * Alta y edición de rol.
 *
 * Editar los permisos surte efecto en la **siguiente petición** de cualquier
 * usuario con ese rol, sin que tenga que volver a entrar (FLUJO-USUARIOS §6).
 * Se avisa porque cambia el cálculo de riesgo: quitar un permiso aquí no espera
 * a mañana, corta el acceso ahora mismo a quien lo esté usando.
 *
 * Un rol de sistema no se edita: su `acceso_total` autoriza todo por bypass y
 * la lista de permisos es irrelevante para él.
 */
@Component({
  selector: 'app-rol-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent, SelectorPermisosComponent],
  template: `
    <app-modal [titulo]="titulo()" ancho="lg" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <app-campo etiqueta="Nombre del rol" paraId="nombre" [error]="errorDe('nombre')">
        <input
          id="nombre"
          class="campo-control"
          [value]="nombre()"
          (input)="nombre.set($any($event.target).value)"
        />
      </app-campo>

      @if (rol()) {
        <p
          class="rounded border border-outline-variant bg-warning-container px-3 py-2 text-body-sm text-on-warning-container"
        >
          Los cambios se aplican de inmediato: quien tenga este rol verá su acceso ajustado en su
          siguiente acción, sin necesidad de volver a entrar.
        </p>
      }

      @if (permisos.isPending()) {
        <p class="text-body-sm text-on-surface-variant">Cargando catálogo de permisos…</p>
      } @else if (permisos.isError()) {
        <p class="text-body-sm text-error">{{ errorCatalogo() }}</p>
      } @else {
        <app-selector-permisos
          [dominios]="permisos.data()?.dominios ?? []"
          [(seleccionados)]="seleccionados"
        />
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
          {{ enviando() ? 'Guardando…' : 'Guardar rol' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class RolFormModal {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);

  readonly rol = input<Rol | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<RolCreate>();
  readonly cerrar = output<void>();

  protected readonly nombre = signal('');
  protected readonly seleccionados = signal<string[]>([]);

  protected readonly permisos = injectQuery(() => ({
    queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'permisos'),
    queryFn: () => this.api.catalogoPermisos(),
  }));

  protected readonly titulo = computed(() => {
    const existente = this.rol();
    return existente ? `Editar ${existente.nombre}` : 'Nuevo rol';
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly valido = computed(() => this.nombre().trim() !== '');

  constructor() {
    const existente = this.rol();
    if (existente) {
      this.nombre.set(existente.nombre);
      // El rol trae sus permisos agrupados por dominio; el selector trabaja con
      // una lista plana de códigos.
      this.seleccionados.set(
        existente.permisos.flatMap((grupo) => grupo.permisos.map((permiso) => permiso.codigo)),
      );
    }
  }

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected errorCatalogo(): string {
    return mensajeDeError(this.permisos.error(), 'No se pudo cargar el catálogo de permisos.');
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    this.guardar.emit({
      nombre: this.nombre().trim(),
      permisos: this.seleccionados(),
    });
  }
}
