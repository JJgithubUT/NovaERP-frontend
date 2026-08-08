import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { Pedido, PedidoCreate } from '../../../api/models';
import { VentasApi } from '../../../api/services/ventas.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import {
  LineasEditorComponent,
  lineaEsValida,
  lineaVacia,
  type LineaEditable,
} from '../lineas-editor.component';

/** Cuántas cotizaciones aprobadas se ofrecen sin obligar a buscar. */
const MAX_COTIZACIONES = 50;

/**
 * Alta y edición de pedido (FLUJO-VENTAS §4).
 *
 * Un pedido nace de dos formas excluyentes: **desde una cotización aprobada**
 * (hereda cliente y líneas) o **directo**, eligiendo cliente y capturando
 * líneas. El selector de arriba decide cuál, y solo se manda uno de los dos
 * cuerpos — mezclarlos daría un 422.
 *
 * Crear solo arma el borrador. Nada se reserva ni se valida contra el crédito
 * hasta confirmar, que es una acción aparte.
 */
@Component({
  selector: 'app-pedido-form-modal',
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

      @if (pedido()) {
        <p class="text-body-sm text-on-surface-variant">
          Solo se pueden cambiar las líneas, y solo mientras el pedido siga en borrador.
        </p>
      } @else {
        <app-campo etiqueta="Origen del pedido" paraId="origen">
          <select
            id="origen"
            class="campo-control"
            [value]="origen()"
            (change)="cambiarOrigen($event)"
          >
            <option value="cotizacion">Desde una cotización aprobada</option>
            <option value="directo">Directo (cliente y líneas)</option>
          </select>
        </app-campo>
      }

      @if (modoCotizacion()) {
        <app-campo
          etiqueta="Cotización aprobada"
          paraId="cotizacion"
          [error]="errorDe('cotizacion_id')"
          ayuda="Solo aparecen las aprobadas: una en borrador no se puede convertir."
        >
          <select
            id="cotizacion"
            class="campo-control"
            [value]="cotizacionId()"
            (change)="cotizacionId.set($any($event.target).value)"
          >
            <option value="">Selecciona una cotización…</option>
            @for (cot of aprobadas.data() ?? []; track cot.id) {
              <option [value]="cot.id">{{ cot.folio }} · {{ moneda(cot.total) }}</option>
            }
          </select>
        </app-campo>

        @if (aprobadas.isSuccess() && aprobadas.data().length === 0) {
          <p class="text-label-md text-on-surface-variant">
            No hay cotizaciones aprobadas. Aprueba una primero, o crea el pedido directo.
          </p>
        }
      } @else {
        @if (!pedido()) {
          <app-entity-combo
            etiqueta="Cliente"
            tipo="cliente"
            [valor]="cliente()"
            (valorChange)="cliente.set($event)"
            marcador="Buscar por razón social…"
          />
        }

        <app-lineas-editor [(lineas)]="lineas" />
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
          {{ enviando() ? 'Guardando…' : 'Guardar borrador' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class PedidoFormModal implements OnInit {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);

  readonly pedido = input<Pedido | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<PedidoCreate>();
  readonly cerrar = output<void>();

  protected readonly origen = signal<'cotizacion' | 'directo'>('cotizacion');
  protected readonly cotizacionId = signal('');
  protected readonly cliente = signal<OpcionCombo | null>(null);
  protected readonly lineas = signal<LineaEditable[]>([lineaVacia()]);

  /** Editar siempre es por líneas: el origen ya no se puede cambiar. */
  protected readonly modoCotizacion = computed(
    () => this.pedido() === null && this.origen() === 'cotizacion',
  );

  protected readonly aprobadas = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = { estado: 'aprobada' as const, page_size: MAX_COTIZACIONES };

    return {
      queryKey: qk.lista(slug, 'cotizaciones', filtros),
      enabled: this.modoCotizacion() && slug !== '',
      queryFn: () => this.api.listarCotizaciones(filtros).then((pagina) => pagina.results),
    };
  });

  protected readonly titulo = computed(() => {
    const existente = this.pedido();
    return existente ? `Editar ${existente.folio}` : 'Nuevo pedido';
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly valido = computed(() => {
    if (this.modoCotizacion()) return this.cotizacionId() !== '';

    const clienteOk = this.pedido() !== null || this.cliente() !== null;
    return clienteOk && this.lineas().length > 0 && this.lineas().every(lineaEsValida);
  });

  protected readonly moneda = formatMoneda;

  /**
   * Los valores de los `input()` se asignan DESPUÉS de construir el componente,
   * así que esto no puede vivir en el constructor: ahí el input todavía vale
   * `null` y el formulario se quedaba vacío al editar.
   */
  ngOnInit(): void {
    const existente = this.pedido();
    if (existente) {
      this.origen.set('directo');
      this.lineas.set(
        existente.lineas.map((linea) => ({
          producto: { id: linea.producto_id, etiqueta: linea.producto_id.slice(0, 8) },
          cantidad: linea.cantidad,
          precio: linea.precio_unitario,
        })),
      );
    }
  }

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected cambiarOrigen(evento: Event): void {
    this.origen.set((evento.target as HTMLSelectElement).value as 'cotizacion' | 'directo');
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    if (this.modoCotizacion()) {
      this.guardar.emit({ cotizacion_id: this.cotizacionId() });
      return;
    }

    this.guardar.emit({
      cliente_id: this.cliente()?.id ?? this.pedido()?.cliente_id ?? '',
      lineas: this.lineas().map((linea) => ({
        producto_id: linea.producto!.id,
        cantidad: linea.cantidad.trim(),
        ...(linea.precio.trim() === '' ? {} : { precio_unitario: linea.precio.trim() }),
      })),
    });
  }
}
