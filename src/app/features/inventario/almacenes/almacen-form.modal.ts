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
import type { Almacen, AlmacenCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/**
 * Alta y edición de almacén. Presentacional, igual que el de producto: recibe
 * el estado de la mutación y emite `guardar`.
 *
 * El nombre es único por tenant (lo valida el backend con un 422 sobre el campo
 * `nombre`), y además es la clave con la que el kardex y el stock identifican
 * el almacén: renombrarlo cambia lo que muestran esas vistas.
 */
@Component({
  selector: 'app-almacen-form-modal',
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
        <app-campo etiqueta="Nombre" paraId="nombre" [error]="errorDe('nombre')">
          <input id="nombre" class="campo-control" formControlName="nombre" />
        </app-campo>

        <app-campo etiqueta="Ubicación" paraId="ubicacion" [error]="errorDe('ubicacion')">
          <input id="ubicacion" class="campo-control" formControlName="ubicacion" />
        </app-campo>
      </form>

      <div footer class="flex w-full items-center gap-2">
        @if (almacen(); as existente) {
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
export class AlmacenFormModal implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly almacen = input<Almacen | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<AlmacenCreate>();
  readonly darDeBaja = output<Almacen>();
  readonly cerrar = output<void>();

  protected readonly form = this.fb.group({
    nombre: this.fb.control('', Validators.required),
    ubicacion: this.fb.control(''),
  });

  protected readonly titulo = computed(() => {
    const existente = this.almacen();
    return existente ? `Editar ${existente.nombre}` : 'Nuevo almacén';
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  /**
   * Los valores de los `input()` se asignan DESPUÉS de construir el componente,
   * así que esto no puede vivir en el constructor: ahí el input todavía vale
   * `null` y el formulario se quedaba vacío al editar.
   */
  ngOnInit(): void {
    const existente = this.almacen();
    if (existente) {
      this.form.setValue({
        nombre: existente.nombre,
        ubicacion: existente.ubicacion ?? '',
      });
    }
  }

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched && control.hasError('required')) return 'Este campo es obligatorio.';
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    this.guardar.emit({
      nombre: valor.nombre,
      ubicacion: valor.ubicacion.trim() || null,
    });
  }
}
