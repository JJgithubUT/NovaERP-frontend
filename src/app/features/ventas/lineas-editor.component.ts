import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../shared/ui/entity-combo/entity-combo.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { Big, formatMoneda, isValidDecimal, toDecimal } from '../../shared/utils/decimal.util';

/** Una línea en edición. Los importes son texto hasta que salen al backend. */
export interface LineaEditable {
  producto: OpcionCombo | null;
  cantidad: string;
  /** Vacío = usar el precio del catálogo del producto. */
  precio: string;
}

export function lineaVacia(): LineaEditable {
  return { producto: null, cantidad: '1', precio: '' };
}

/**
 * Editor de las líneas de una cotización o un pedido.
 *
 * Dejar el precio en blanco no es lo mismo que escribir el del catálogo: en
 * blanco el backend toma `producto.precio_venta`, mientras que enviarlo
 * explícitamente cuenta como **ajuste manual** y exige el permiso
 * `ventas:cotizaciones:ajustar_precio` (→ 403). Por eso el campo se manda solo
 * si el usuario lo escribió, y el texto de ayuda lo advierte.
 *
 * El total que se muestra es una estimación local para dar contexto mientras se
 * captura. El importe bueno lo calcula el backend, que además aplica el
 * descuento y —en la factura— los impuestos.
 */
@Component({
  selector: 'app-lineas-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityComboComponent, IconComponent],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="text-label-caps uppercase text-on-surface-variant">Líneas</h3>
        @if (subtotal(); as total) {
          <p class="font-mono text-body-sm tabular-nums text-on-surface-variant">
            Subtotal estimado: <span class="font-bold text-on-surface">{{ total }}</span>
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
            (valorChange)="fijarProducto($index, $event)"
            marcador="Buscar por SKU o nombre…"
          />

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-label-caps uppercase text-on-surface-variant">Cantidad</label>
              <input
                class="campo-control"
                inputmode="decimal"
                [value]="linea.cantidad"
                (input)="fijarCantidad($index, $any($event.target).value)"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-label-caps uppercase text-on-surface-variant">
                Precio unitario
              </label>
              <input
                class="campo-control"
                inputmode="decimal"
                placeholder="Del catálogo"
                [value]="linea.precio"
                (input)="fijarPrecio($index, $any($event.target).value)"
              />
            </div>
          </div>

          @if (linea.precio.trim() !== '') {
            <p class="text-label-md text-on-surface-variant">
              Fijar el precio a mano cuenta como ajuste manual y requiere permiso.
            </p>
          }
        </div>
      }

      <button type="button" class="btn btn-secundario self-start" (click)="agregar()">
        <app-icon name="add" [size]="16" />
        Añadir línea
      </button>
    </div>
  `,
})
export class LineasEditorComponent {
  readonly lineas = model.required<LineaEditable[]>();

  /** Se oculta el subtotal cuando el contexto ya muestra uno mejor. */
  readonly mostrarSubtotal = input(true);

  /**
   * Suma solo lo que tiene precio explícito y cantidad válida. Las líneas que
   * usan el precio del catálogo no se pueden sumar aquí sin pedir el producto,
   * así que se omiten en vez de contarlas como cero: un total a la baja
   * confundiría más que no enseñar ninguno.
   */
  protected readonly subtotal = computed(() => {
    if (!this.mostrarSubtotal()) return null;

    const conPrecio = this.lineas().filter(
      (linea) =>
        linea.precio.trim() !== '' &&
        isValidDecimal(linea.precio) &&
        isValidDecimal(linea.cantidad),
    );
    if (conPrecio.length === 0) return null;

    const total = conPrecio.reduce(
      (acumulado, linea) =>
        acumulado.plus(toDecimal(linea.cantidad).times(toDecimal(linea.precio))),
      new Big(0),
    );

    const parcial = conPrecio.length < this.lineas().length;
    return parcial ? `${formatMoneda(total.toString())} (parcial)` : formatMoneda(total.toString());
  });

  protected agregar(): void {
    this.lineas.update((lineas) => [...lineas, lineaVacia()]);
  }

  protected quitar(indice: number): void {
    this.lineas.update((lineas) => lineas.filter((_, i) => i !== indice));
  }

  protected fijarProducto(indice: number, producto: OpcionCombo | null): void {
    this.actualizar(indice, { producto });
  }

  protected fijarCantidad(indice: number, cantidad: string): void {
    this.actualizar(indice, { cantidad });
  }

  protected fijarPrecio(indice: number, precio: string): void {
    this.actualizar(indice, { precio });
  }

  private actualizar(indice: number, cambio: Partial<LineaEditable>): void {
    this.lineas.update((lineas) =>
      lineas.map((linea, i) => (i === indice ? { ...linea, ...cambio } : linea)),
    );
  }
}

/** ¿Está la línea lista para enviarse? Producto elegido y cantidad válida. */
export function lineaEsValida(linea: LineaEditable): boolean {
  return (
    linea.producto !== null &&
    isValidDecimal(linea.cantidad) &&
    toDecimal(linea.cantidad).gt(0) &&
    (linea.precio.trim() === '' || isValidDecimal(linea.precio))
  );
}
