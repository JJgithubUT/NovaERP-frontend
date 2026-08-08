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
import type { Producto, ProductoCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { decimalNoNegativo } from '../../../shared/forms/decimal.validator';

/**
 * Alta y edición de producto.
 *
 * Es presentacional: no llama al API. Recibe el estado de la mutación
 * (`enviando`, `error`) y emite `guardar`. Así la página sigue siendo la dueña
 * de la caché y de qué invalidar, y este componente se puede probar sin red.
 *
 * Los decimales viajan como **string** de punta a punta —del input al backend—
 * sin pasar por `Number`. Ver `decimal.util.ts` sobre por qué.
 */
@Component({
  selector: 'app-producto-form-modal',
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
        <app-campo etiqueta="SKU" paraId="sku" [error]="errorDe('sku')">
          <input id="sku" class="campo-control" formControlName="sku" autocomplete="off" />
        </app-campo>

        <app-campo etiqueta="Nombre" paraId="nombre" [error]="errorDe('nombre')">
          <input id="nombre" class="campo-control" formControlName="nombre" />
        </app-campo>

        <app-campo etiqueta="Descripción" paraId="descripcion" [error]="errorDe('descripcion')">
          <textarea
            id="descripcion"
            class="campo-control min-h-16"
            formControlName="descripcion"
          ></textarea>
        </app-campo>

        <div class="grid grid-cols-2 gap-3">
          <app-campo
            etiqueta="Costo referencia"
            paraId="costo"
            [error]="errorDe('costo_referencia')"
          >
            <input
              id="costo"
              class="campo-control"
              inputmode="decimal"
              formControlName="costo_referencia"
            />
          </app-campo>

          <app-campo etiqueta="Precio venta" paraId="precio" [error]="errorDe('precio_venta')">
            <input
              id="precio"
              class="campo-control"
              inputmode="decimal"
              formControlName="precio_venta"
            />
          </app-campo>
        </div>

        <app-campo
          etiqueta="Stock mínimo"
          paraId="stockMin"
          [error]="errorDe('stock_minimo')"
          ayuda="Genera una alerta cuando la existencia cae a este nivel o por debajo."
        >
          <input
            id="stockMin"
            class="campo-control"
            inputmode="decimal"
            formControlName="stock_minimo"
          />
        </app-campo>
      </form>

      <div footer class="flex w-full items-center gap-2">
        @if (producto(); as existente) {
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
export class ProductoFormModal implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  /** `null` = alta. Con valor = edición. */
  readonly producto = input<Producto | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<ProductoCreate>();
  readonly darDeBaja = output<Producto>();
  readonly cerrar = output<void>();

  protected readonly form = this.fb.group({
    sku: this.fb.control('', Validators.required),
    nombre: this.fb.control('', Validators.required),
    descripcion: this.fb.control(''),
    costo_referencia: this.fb.control('0', decimalNoNegativo),
    precio_venta: this.fb.control('0', decimalNoNegativo),
    stock_minimo: this.fb.control('0', decimalNoNegativo),
  });

  protected readonly titulo = computed(() => {
    const existente = this.producto();
    return existente ? `Editar ${existente.sku}` : 'Nuevo producto';
  });

  /** Banner general: solo si el 422 no señaló un campo concreto. */
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
    // El componente se crea y se destruye con el `@if` del padre, así que
    // basta con sembrar el formulario una vez: no hay un caso en que el
    // `producto` cambie sin que el modal se haya recreado.
    const existente = this.producto();
    if (existente) {
      this.form.setValue({
        sku: existente.sku,
        nombre: existente.nombre,
        descripcion: existente.descripcion ?? '',
        costo_referencia: existente.costo_referencia,
        precio_venta: existente.precio_venta,
        stock_minimo: existente.stock_minimo,
      });
    }
  }

  protected errorDe(campo: string): string {
    const control = this.form.get(campo);
    if (control?.touched && control.hasError('decimal')) {
      return 'Debe ser un número mayor o igual a 0.';
    }
    if (control?.touched && control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    // El 422 del backend gana sobre la validación local: sabe cosas que el
    // navegador no, como que el SKU ya existe en este tenant.
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    this.guardar.emit({
      ...valor,
      descripcion: valor.descripcion.trim() || null,
    });
  }
}
