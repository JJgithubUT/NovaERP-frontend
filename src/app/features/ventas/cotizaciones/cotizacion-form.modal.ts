import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import type { Cotizacion, CotizacionCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';
import {
  LineasEditorComponent,
  lineaEsValida,
  lineaVacia,
  type LineaEditable,
} from '../lineas-editor.component';

/**
 * Alta y edición de cotización (FLUJO-VENTAS §3).
 *
 * Dos cosas que la pantalla deja explícitas porque sorprenden:
 *
 * - **Un descuento por encima del máximo del tenant no falla**: la cotización
 *   nace en `pendiente_aprobacion` en vez de en `borrador` (RN03). No se puede
 *   avisar de antemano cuál es ese máximo —la API no lo expone— pero sí de que
 *   existe el mecanismo.
 * - **No hay impuestos aquí.** El total es `subtotal − descuento`; el IVA
 *   aparece al facturar.
 *
 * Al editar, el cliente no se toca: el PATCH solo acepta descuento, vigencia y
 * líneas.
 */
@Component({
  selector: 'app-cotizacion-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent, EntityComboComponent, LineasEditorComponent],
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

      @if (!cotizacion()) {
        <app-entity-combo
          etiqueta="Cliente"
          tipo="cliente"
          [valor]="cliente()"
          (valorChange)="cliente.set($event)"
          marcador="Buscar por razón social…"
        />
      }

      <div class="grid gap-3 sm:grid-cols-2">
        <app-campo
          etiqueta="Descuento %"
          paraId="descuento"
          [error]="errorDescuento()"
          ayuda="Si supera el máximo de la empresa, nacerá pendiente de aprobación."
        >
          <input
            id="descuento"
            class="campo-control"
            inputmode="decimal"
            [value]="descuento()"
            (input)="descuento.set($any($event.target).value)"
          />
        </app-campo>

        <app-campo
          etiqueta="Vigente hasta"
          paraId="vigencia"
          [error]="errorDe('vigente_hasta')"
          ayuda="Pasada esta fecha ya no se podrá aprobar."
        >
          <input
            id="vigencia"
            type="date"
            class="campo-control"
            [value]="vigencia()"
            (input)="vigencia.set($any($event.target).value)"
          />
        </app-campo>
      </div>

      <app-lineas-editor [(lineas)]="lineas" />

      <p class="text-label-md text-on-surface-variant">
        La cotización no desglosa impuestos: el total es subtotal menos descuento.
      </p>

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
export class CotizacionFormModal implements OnInit {
  readonly cotizacion = input<Cotizacion | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<CotizacionCreate>();
  readonly cerrar = output<void>();

  protected readonly cliente = signal<OpcionCombo | null>(null);
  protected readonly descuento = signal('0');
  protected readonly vigencia = signal('');
  protected readonly lineas = signal<LineaEditable[]>([lineaVacia()]);

  protected readonly titulo = computed(() => {
    const existente = this.cotizacion();
    return existente ? `Editar ${existente.folio}` : 'Nueva cotización';
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly errorDescuento = computed(() => {
    const valor = this.descuento().trim();
    if (valor !== '' && !this.descuentoEnRango(valor)) return 'Debe ser un número entre 0 y 100.';
    return campoDeError(this.error()) === 'descuento_pct' ? mensajeDeError(this.error()) : '';
  });

  protected readonly valido = computed(() => {
    const clienteOk = this.cotizacion() !== null || this.cliente() !== null;
    const descuento = this.descuento().trim();
    return (
      clienteOk &&
      this.lineas().length > 0 &&
      this.lineas().every(lineaEsValida) &&
      (descuento === '' || this.descuentoEnRango(descuento))
    );
  });

  /**
   * Los valores de los `input()` se asignan DESPUÉS de construir el componente,
   * así que esto no puede vivir en el constructor: ahí el input todavía vale
   * `null` y el formulario se quedaba vacío al editar.
   */
  ngOnInit(): void {
    const existente = this.cotizacion();
    if (existente) {
      this.descuento.set(existente.descuento_pct);
      this.vigencia.set(existente.vigente_hasta ?? '');
      this.lineas.set(
        existente.lineas.map((linea) => ({
          producto: { id: linea.producto_id, etiqueta: linea.descripcion },
          cantidad: linea.cantidad,
          precio: linea.precio_unitario,
        })),
      );
    }
  }

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    const descuento = this.descuento().trim();
    const vigencia = this.vigencia();

    this.guardar.emit({
      cliente_id: this.cliente()?.id ?? this.cotizacion()?.cliente_id ?? '',
      ...(descuento === '' ? {} : { descuento_pct: descuento }),
      ...(vigencia === '' ? {} : { vigente_hasta: vigencia }),
      lineas: this.lineas().map((linea) => ({
        producto_id: linea.producto!.id,
        cantidad: linea.cantidad.trim(),
        // Solo si se escribió: mandarlo cuenta como ajuste manual de precio.
        ...(linea.precio.trim() === '' ? {} : { precio_unitario: linea.precio.trim() }),
      })),
    });
  }

  private descuentoEnRango(valor: string): boolean {
    if (!isValidDecimal(valor)) return false;
    const decimal = toDecimal(valor);
    return decimal.gte(0) && decimal.lte(100);
  }
}
