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
import type { FacturaCreate, Pedido } from '../../../api/models';
import { VentasApi } from '../../../api/services/ventas.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import {
  Big,
  formatCantidad,
  formatMoneda,
  isValidDecimal,
  toDecimal,
} from '../../../shared/utils/decimal.util';

/** Pedidos facturables que se ofrecen sin obligar a buscar. */
const MAX_PEDIDOS = 50;

/**
 * Emisión de factura sobre un pedido (FLUJO-VENTAS §5).
 *
 * Dos modos, y la diferencia importa:
 *
 * - **Total** — se omite `lineas` y el backend factura todo lo pendiente *y
 *   reservado*. Es lo habitual.
 * - **Parcial** — se mandan cantidades por línea. Ninguna puede superar su
 *   `pendiente_facturar` (RN01 → 422), así que el formulario las acota antes de
 *   enviar.
 *
 * Facturar no es reversible: convierte la reserva en salida definitiva de
 * inventario y crea la cuenta por cobrar. Una factura emitida no se edita ni se
 * borra; lo único que la corrige es una nota de crédito.
 */
@Component({
  selector: 'app-factura-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent],
  template: `
    <app-modal titulo="Nueva factura" ancho="lg" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <app-campo
        etiqueta="Pedido"
        paraId="pedido"
        [error]="errorDe('pedido_id')"
        ayuda="Solo aparecen los pedidos confirmados con cantidades pendientes."
      >
        <select
          id="pedido"
          class="campo-control"
          [value]="pedidoId()"
          (change)="elegirPedido($event)"
        >
          <option value="">Selecciona un pedido…</option>
          @for (pedido of facturables.data() ?? []; track pedido.id) {
            <option [value]="pedido.id">{{ pedido.folio }} · {{ moneda(pedido.total) }}</option>
          }
        </select>
      </app-campo>

      @if (facturables.isSuccess() && facturables.data().length === 0) {
        <p class="text-label-md text-on-surface-variant">
          No hay pedidos facturables. Confirma un pedido antes de facturarlo.
        </p>
      }

      @if (pedidoElegido(); as pedido) {
        <app-campo etiqueta="Alcance" paraId="alcance">
          <select
            id="alcance"
            class="campo-control"
            [value]="modo()"
            (change)="cambiarModo($event)"
          >
            <option value="total">Facturar todo lo pendiente</option>
            <option value="parcial">Facturar cantidades concretas</option>
          </select>
        </app-campo>

        <div class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="num">Pedido</th>
                <th class="num">Pendiente</th>
                @if (modo() === 'parcial') {
                  <th class="num">A facturar</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (linea of pedido.lineas; track linea.id) {
                <tr>
                  <td class="clave">{{ linea.producto_id.slice(0, 8) }}</td>
                  <td class="num tenue">{{ cantidad(linea.cantidad) }}</td>
                  <td class="num font-semibold">{{ cantidad(linea.pendiente_facturar) }}</td>
                  @if (modo() === 'parcial') {
                    <td class="num">
                      <input
                        class="campo-control w-28 text-right"
                        inputmode="decimal"
                        [value]="cantidadDe(linea.id)"
                        (input)="fijarCantidad(linea.id, $any($event.target).value)"
                      />
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (errorParcial(); as mensaje) {
          <p class="text-label-md text-error" role="alert">{{ mensaje }}</p>
        }
      }

      <p class="text-label-md text-on-surface-variant">
        Al emitirla se descuenta el stock reservado y se crea la cuenta por cobrar. Los impuestos se
        calculan aquí, no en la cotización.
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
          {{ enviando() ? 'Emitiendo…' : 'Emitir factura' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class FacturaFormModal {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);

  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<FacturaCreate>();
  readonly cerrar = output<void>();

  protected readonly pedidoId = signal('');
  protected readonly modo = signal<'total' | 'parcial'>('total');
  /** `pedido_linea_id` → cantidad tecleada. */
  protected readonly cantidades = signal<Record<string, string>>({});

  protected readonly facturables = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = { page_size: MAX_PEDIDOS };

    return {
      queryKey: [...qk.lista(slug, 'pedidos', filtros), 'facturables'] as const,
      enabled: slug !== '',
      queryFn: () =>
        this.api.listarPedidos(filtros).then((pagina) =>
          // El backend no tiene un filtro "facturable", así que se acota aquí:
          // confirmados o parcialmente facturados, y con algo pendiente.
          pagina.results.filter(
            (pedido) =>
              ['confirmado', 'pendiente_surtido', 'facturado_parcial'].includes(pedido.estado) &&
              pedido.lineas.some((linea) => toDecimal(linea.pendiente_facturar).gt(0)),
          ),
        ),
    };
  });

  protected readonly pedidoElegido = computed<Pedido | null>(
    () => (this.facturables.data() ?? []).find((pedido) => pedido.id === this.pedidoId()) ?? null,
  );

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  /** Valida RN01 en local para no gastar un viaje en un 422 evitable. */
  protected readonly errorParcial = computed(() => {
    if (this.modo() !== 'parcial') return null;

    const pedido = this.pedidoElegido();
    if (!pedido) return null;

    for (const linea of pedido.lineas) {
      const valor = (this.cantidades()[linea.id] ?? '').trim();
      if (valor === '') continue;
      if (!isValidDecimal(valor)) return 'Hay cantidades que no son números válidos.';
      if (toDecimal(valor).gt(toDecimal(linea.pendiente_facturar))) {
        return 'No se puede facturar más de lo pendiente en una línea.';
      }
    }

    return this.totalParcial().eq(0) ? 'Indica al menos una cantidad a facturar.' : null;
  });

  protected readonly valido = computed(() => {
    if (this.pedidoId() === '') return false;
    if (this.modo() === 'total') return true;
    return this.errorParcial() === null;
  });

  protected readonly moneda = formatMoneda;
  protected readonly cantidad = formatCantidad;

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected elegirPedido(evento: Event): void {
    this.pedidoId.set((evento.target as HTMLSelectElement).value);
    this.cantidades.set({});
  }

  protected cambiarModo(evento: Event): void {
    this.modo.set((evento.target as HTMLSelectElement).value as 'total' | 'parcial');
  }

  protected cantidadDe(lineaId: string): string {
    return this.cantidades()[lineaId] ?? '';
  }

  protected fijarCantidad(lineaId: string, valor: string): void {
    this.cantidades.update((actual) => ({ ...actual, [lineaId]: valor }));
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    if (this.modo() === 'total') {
      // Sin `lineas` el backend factura todo lo pendiente y reservado.
      this.guardar.emit({ pedido_id: this.pedidoId() });
      return;
    }

    const lineas = Object.entries(this.cantidades())
      .filter(([, valor]) => valor.trim() !== '' && toDecimal(valor).gt(0))
      .map(([pedido_linea_id, cantidad]) => ({ pedido_linea_id, cantidad: cantidad.trim() }));

    this.guardar.emit({ pedido_id: this.pedidoId(), lineas });
  }

  private totalParcial(): Big {
    return Object.values(this.cantidades()).reduce((suma, valor) => {
      const limpio = valor.trim();
      return limpio !== '' && isValidDecimal(limpio) ? suma.plus(toDecimal(limpio)) : suma;
    }, new Big(0));
  }
}
