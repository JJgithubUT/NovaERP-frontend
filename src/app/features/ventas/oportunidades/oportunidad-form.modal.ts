import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import type { Oportunidad, OportunidadCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { isNonNegative } from '../../../shared/utils/decimal.util';
import { aFechaIso } from '../../../shared/utils/fecha.util';

/**
 * Alta y edición de oportunidad (FLUJO-VENTAS §2).
 *
 * El cliente solo se elige al crear: al editar, el backend acepta únicamente
 * `nombre`, `valor_estimado` y `fecha_cierre_estimada`. Cambiar de cliente
 * sería otra oportunidad, no la misma.
 *
 * La etapa tampoco está aquí. Se mueve con su propia acción, que valida que
 * sea la siguiente de la secuencia.
 */
@Component({
  selector: 'app-oportunidad-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent, EntityComboComponent],
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

      @if (!oportunidad()) {
        <app-entity-combo
          etiqueta="Cliente"
          tipo="cliente"
          [valor]="cliente()"
          (valorChange)="cliente.set($event)"
          marcador="Buscar por razón social…"
        />
      }

      <app-campo etiqueta="Nombre" paraId="nombre" [error]="errorDe('nombre')">
        <input
          id="nombre"
          class="campo-control"
          [value]="nombre()"
          (input)="nombre.set($any($event.target).value)"
        />
      </app-campo>

      <app-campo etiqueta="Valor estimado" paraId="valor" [error]="errorValor()">
        <input
          id="valor"
          class="campo-control"
          inputmode="decimal"
          [value]="valor()"
          (input)="valor.set($any($event.target).value)"
        />
      </app-campo>

      <app-campo
        etiqueta="Fecha de cierre estimada"
        paraId="fecha"
        [error]="errorDe('fecha_cierre_estimada')"
        ayuda="No puede ser anterior a hoy."
      >
        <input
          id="fecha"
          type="date"
          class="campo-control"
          [min]="hoy"
          [value]="fecha()"
          (input)="fecha.set($any($event.target).value)"
        />
      </app-campo>

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
export class OportunidadFormModal implements OnInit {
  /** `null` = alta. Con valor = edición (sin cambiar de cliente). */
  readonly oportunidad = input<Oportunidad | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<OportunidadCreate>();
  readonly cerrar = output<void>();

  protected readonly hoy = aFechaIso(new Date());

  protected readonly cliente = signal<OpcionCombo | null>(null);
  protected readonly nombre = signal('');
  protected readonly valor = signal('');
  protected readonly fecha = signal('');

  protected readonly titulo = computed(() =>
    this.oportunidad() ? 'Editar oportunidad' : 'Nueva oportunidad',
  );

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly errorValor = computed(() => {
    const valor = this.valor().trim();
    if (valor !== '' && !isNonNegative(valor)) return 'Debe ser un número mayor o igual a 0.';
    return campoDeError(this.error()) === 'valor_estimado' ? mensajeDeError(this.error()) : '';
  });

  protected readonly valido = computed(() => {
    const valor = this.valor().trim();
    const clienteOk = this.oportunidad() !== null || this.cliente() !== null;
    return clienteOk && this.nombre().trim() !== '' && (valor === '' || isNonNegative(valor));
  });

  /**
   * Los valores de los `input()` se asignan DESPUÉS de construir el componente,
   * así que esto no puede vivir en el constructor: ahí el input todavía vale
   * `null` y el formulario se quedaba vacío al editar.
   */
  ngOnInit(): void {
    const existente = this.oportunidad();
    if (existente) {
      this.nombre.set(existente.nombre);
      this.valor.set(existente.valor_estimado ?? '');
      this.fecha.set(existente.fecha_cierre_estimada ?? '');
    }
  }

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    const valor = this.valor().trim();
    const fecha = this.fecha();

    this.guardar.emit({
      // Al editar, la página ignora `cliente_id`: el PATCH no lo acepta.
      cliente_id: this.cliente()?.id ?? this.oportunidad()?.cliente_id ?? '',
      nombre: this.nombre().trim(),
      ...(valor === '' ? {} : { valor_estimado: valor }),
      ...(fecha === '' ? {} : { fecha_cierre_estimada: fecha }),
    });
  }
}
