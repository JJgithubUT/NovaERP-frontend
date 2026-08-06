import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { Big, formatMoneda, isValidDecimal, toDecimal } from '../../../shared/utils/decimal.util';

export interface LineaOrden {
  producto: OpcionCombo | null;
  cantidad: string;
  /** Obligatorio: aquí no hay precio de catálogo al que caer. */
  costo: string;
}

export function lineaOrdenVacia(): LineaOrden {
  return { producto: null, cantidad: '1', costo: '' };
}

/**
 * Editor de líneas de una orden de compra.
 *
 * No reusa el de Ventas porque las semánticas no coinciden: allí el precio es
 * opcional y omitirlo significa "toma el del catálogo"; aquí el
 * `costo_unitario` es obligatorio, es lo que se le paga al proveedor, y no hay
 * valor por defecto que aplicar.
 *
 * Por eso el subtotal sí se puede calcular entero, y se muestra: es la cifra
 * que decide si la orden va a superar el umbral de aprobación.
 */
@Component({
  selector: 'app-lineas-orden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityComboComponent, IconComponent],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="text-label-caps uppercase text-on-surface-variant">Líneas</h3>
        @if (subtotal(); as total) {
          <p class="font-mono text-body-sm tabular-nums text-on-surface-variant">
            Total estimado: <span class="font-bold text-on-surface">{{ total }}</span>
          </p>
        }
      </div>

      @for (linea of lineas(); track $index) {
        <div class="flex flex-col gap-2 rounded border border-outline-variant p-3">
          <div class="flex items-start justify-between gap-2">
            <span class="text-label-md text-on-surface-variant">Línea {{ $index + 1 }}</span>
            @if (lineas().length > 1) {
              <button
                type="button"
                class="text-on-surface-variant transition-colors hover:text-error"
                (click)="quitar($index)"
              >
                <app-icon name="delete" [size]="16" label="Quitar línea" />
              </button>
            }
          </div>

          <app-entity-combo
            etiqueta="Producto"
            tipo="producto"
            [valor]="linea.producto"
            (valorChange)="fijar($index, { producto: $event })"
            marcador="Buscar por SKU o nombre…"
          />

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-label-caps uppercase text-on-surface-variant">Cantidad</label>
              <input
                class="campo-control"
                inputmode="decimal"
                [value]="linea.cantidad"
                (input)="fijar($index, { cantidad: $any($event.target).value })"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-label-caps uppercase text-on-surface-variant">
                Costo unitario
              </label>
              <input
                class="campo-control"
                inputmode="decimal"
                [value]="linea.costo"
                (input)="fijar($index, { costo: $any($event.target).value })"
              />
            </div>
          </div>
        </div>
      }

      <button type="button" class="btn btn-secundario self-start" (click)="agregar()">
        <app-icon name="add" [size]="16" />
        Añadir línea
      </button>
    </div>
  `,
})
export class LineasOrdenComponent {
  readonly lineas = model.required<LineaOrden[]>();

  /**
   * Total local, informativo. El bueno lo calcula el backend, que además es
   * quien lo compara contra el umbral y decide si la orden nace pendiente de
   * aprobación.
   */
  protected readonly subtotal = computed(() => {
    const validas = this.lineas().filter(
      (linea) => isValidDecimal(linea.cantidad) && isValidDecimal(linea.costo),
    );
    if (validas.length === 0) return null;

    const total = validas.reduce(
      (suma, linea) => suma.plus(toDecimal(linea.cantidad).times(toDecimal(linea.costo))),
      new Big(0),
    );

    const parcial = validas.length < this.lineas().length;
    return parcial ? `${formatMoneda(total.toString())} (parcial)` : formatMoneda(total.toString());
  });

  protected agregar(): void {
    this.lineas.update((lineas) => [...lineas, lineaOrdenVacia()]);
  }

  protected quitar(indice: number): void {
    this.lineas.update((lineas) => lineas.filter((_, i) => i !== indice));
  }

  protected fijar(indice: number, cambio: Partial<LineaOrden>): void {
    this.lineas.update((lineas) =>
      lineas.map((linea, i) => (i === indice ? { ...linea, ...cambio } : linea)),
    );
  }
}

/** Producto elegido, cantidad > 0 y costo válido y no negativo. */
export function lineaOrdenEsValida(linea: LineaOrden): boolean {
  return (
    linea.producto !== null &&
    isValidDecimal(linea.cantidad) &&
    toDecimal(linea.cantidad).gt(0) &&
    isValidDecimal(linea.costo) &&
    toDecimal(linea.costo).gte(0)
  );
}
