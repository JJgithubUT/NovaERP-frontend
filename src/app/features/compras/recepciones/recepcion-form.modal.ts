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
import type { OrdenCompra, RecepcionCreate } from '../../../api/models';
import { ComprasApi } from '../../../api/services/compras.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import {
  Big,
  formatCantidad,
  formatMoneda,
  isValidDecimal,
  toDecimal,
} from '../../../shared/utils/decimal.util';
import { ordenEsRecibible, pendienteDeLinea } from '../compras.labels';

/** Órdenes recibibles que se ofrecen sin obligar a buscar. */
const MAX_ORDENES = 50;

/**
 * Registro de una recepción de mercancía (FLUJO-COMPRAS §4).
 *
 * Es el paso que mueve todo, y su efecto no se deshace: suma stock con un
 * movimiento de entrada y crea la cuenta por pagar. No existe "anular
 * recepción" — corregir de más se hace con un ajuste de inventario. Por eso el
 * diálogo lo advierte antes de confirmar.
 *
 * Dos validaciones locales, ambas para evitar 422 previsibles:
 *
 * - Ninguna cantidad puede exceder lo pendiente de su línea.
 * - Al menos una línea debe traer cantidad.
 *
 * Y una advertencia sobre el costo: el contrato lo marca opcional, pero
 * omitirlo hace que el backend tome 0 **y recalcule con eso el
 * `costo_referencia` del producto**, dejándolo a cero. Aquí se exige.
 */
@Component({
  selector: 'app-recepcion-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent, EntityComboComponent],
  template: `
    <app-modal titulo="Registrar recepción" ancho="lg" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <app-campo
        etiqueta="Orden de compra"
        paraId="orden"
        [error]="errorDe('orden_id')"
        ayuda="Solo se listan las órdenes aprobadas con mercancía pendiente."
      >
        <select id="orden" class="campo-control" [value]="ordenId()" (change)="elegirOrden($event)">
          <option value="">Selecciona una orden…</option>
          @for (orden of recibibles.data() ?? []; track orden.id) {
            <option [value]="orden.id">{{ orden.folio }} · {{ moneda(orden.total) }}</option>
          }
        </select>
      </app-campo>

      @if (recibibles.isSuccess() && recibibles.data().length === 0) {
        <p class="text-label-md text-on-surface-variant">
          No hay órdenes que admitan recepción. Aprueba una orden pendiente primero.
        </p>
      }

      <app-entity-combo
        etiqueta="Almacén de entrada"
        tipo="almacen"
        [valor]="almacen()"
        (valorChange)="almacen.set($event)"
        marcador="Buscar almacén…"
      />

      @if (ordenElegida(); as orden) {
        <div class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="num">Pedido</th>
                <th class="num">Recibido</th>
                <th class="num">Pendiente</th>
                <th class="num">A recibir</th>
                <th class="num">Costo real</th>
              </tr>
            </thead>
            <tbody>
              @for (linea of orden.lineas; track linea.id) {
                <tr>
                  <td class="clave">{{ linea.producto_id.slice(0, 8) }}</td>
                  <td class="num tenue">{{ cantidad(linea.cantidad) }}</td>
                  <td class="num tenue">{{ cantidad(linea.cantidad_recibida) }}</td>
                  <td class="num font-semibold">{{ pendiente(linea) }}</td>
                  <td class="num">
                    <input
                      class="campo-control w-24 text-right"
                      inputmode="decimal"
                      [value]="cantidadDe(linea.id)"
                      (input)="fijarCantidad(linea.id, $any($event.target).value)"
                    />
                  </td>
                  <td class="num">
                    <input
                      class="campo-control w-28 text-right"
                      inputmode="decimal"
                      [value]="costoDe(linea.id, linea.costo_unitario)"
                      (input)="fijarCosto(linea.id, $any($event.target).value)"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (errorLineas(); as mensaje) {
          <p class="text-label-md text-error" role="alert">{{ mensaje }}</p>
        }

        <p class="text-label-md text-on-surface-variant">
          El costo real es el que facturó el proveedor: con él se recalcula el costo de referencia
          del producto. Viene precargado con el de la orden.
        </p>
      }

      <p
        class="rounded border border-outline-variant bg-warning-container px-3 py-2 text-body-sm text-on-warning-container"
      >
        Registrar la recepción suma stock y crea la cuenta por pagar. No se puede deshacer: una
        corrección posterior se hace con un ajuste de inventario.
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
          {{ enviando() ? 'Registrando…' : 'Registrar recepción' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class RecepcionFormModal {
  private readonly api = inject(ComprasApi);
  private readonly store = inject(AuthStore);

  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<RecepcionCreate>();
  readonly cerrar = output<void>();

  protected readonly ordenId = signal('');
  protected readonly almacen = signal<OpcionCombo | null>(null);
  /** `orden_compra_linea_id` → cantidad / costo tecleados. */
  protected readonly cantidades = signal<Record<string, string>>({});
  protected readonly costos = signal<Record<string, string>>({});

  protected readonly recibibles = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = { page_size: MAX_ORDENES };

    return {
      queryKey: [...qk.lista(slug, 'ordenes-compra', filtros), 'recibibles'] as const,
      enabled: slug !== '',
      queryFn: () =>
        this.api.listarOrdenes(filtros).then((pagina) =>
          // El backend no tiene filtro "recibible": se acota aquí a las
          // aprobadas y abiertas que además tengan algo pendiente.
          pagina.results.filter(
            (orden) =>
              ordenEsRecibible(orden.estado) &&
              orden.lineas.some((linea) => pendienteDeLinea(linea).gt(0)),
          ),
        ),
    };
  });

  protected readonly ordenElegida = computed<OrdenCompra | null>(
    () => (this.recibibles.data() ?? []).find((orden) => orden.id === this.ordenId()) ?? null,
  );

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly errorLineas = computed(() => {
    const orden = this.ordenElegida();
    if (!orden) return null;

    for (const linea of orden.lineas) {
      const valor = (this.cantidades()[linea.id] ?? '').trim();
      if (valor === '') continue;
      if (!isValidDecimal(valor)) return 'Hay cantidades que no son números válidos.';
      if (toDecimal(valor).gt(pendienteDeLinea(linea))) {
        return 'No se puede recibir más de lo pendiente en una línea.';
      }
    }

    return this.totalARecibir().eq(0) ? 'Indica al menos una cantidad a recibir.' : null;
  });

  protected readonly valido = computed(
    () => this.ordenId() !== '' && this.almacen() !== null && this.errorLineas() === null,
  );

  protected readonly moneda = formatMoneda;
  protected readonly cantidad = formatCantidad;

  protected pendiente(linea: { cantidad: string; cantidad_recibida: string }): string {
    return formatCantidad(pendienteDeLinea(linea).toString());
  }

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected elegirOrden(evento: Event): void {
    this.ordenId.set((evento.target as HTMLSelectElement).value);
    this.cantidades.set({});
    this.costos.set({});
  }

  protected cantidadDe(lineaId: string): string {
    return this.cantidades()[lineaId] ?? '';
  }

  /** Precargado con el costo de la orden; se sobreescribe si difiere la factura. */
  protected costoDe(lineaId: string, costoOrden: string): string {
    return this.costos()[lineaId] ?? costoOrden;
  }

  protected fijarCantidad(lineaId: string, valor: string): void {
    this.cantidades.update((actual) => ({ ...actual, [lineaId]: valor }));
  }

  protected fijarCosto(lineaId: string, valor: string): void {
    this.costos.update((actual) => ({ ...actual, [lineaId]: valor }));
  }

  protected enviar(): void {
    const orden = this.ordenElegida();
    const almacen = this.almacen();
    if (!orden || !almacen || !this.valido() || this.enviando()) return;

    const lineas = orden.lineas
      .filter((linea) => {
        const valor = (this.cantidades()[linea.id] ?? '').trim();
        return valor !== '' && isValidDecimal(valor) && toDecimal(valor).gt(0);
      })
      .map((linea) => ({
        orden_compra_linea_id: linea.id,
        cantidad: this.cantidades()[linea.id]!.trim(),
        costo_unitario: this.costoDe(linea.id, linea.costo_unitario).trim(),
      }));

    this.guardar.emit({ orden_id: orden.id, almacen_id: almacen.id, lineas });
  }

  private totalARecibir(): Big {
    return Object.values(this.cantidades()).reduce((suma, valor) => {
      const limpio = valor.trim();
      return limpio !== '' && isValidDecimal(limpio) ? suma.plus(toDecimal(limpio)) : suma;
    }, new Big(0));
  }
}
