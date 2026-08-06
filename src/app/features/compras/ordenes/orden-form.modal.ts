import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { OrdenCompra, OrdenCompraCreate } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import {
  EntityComboComponent,
  type OpcionCombo,
} from '../../../shared/ui/entity-combo/entity-combo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import {
  LineasOrdenComponent,
  lineaOrdenEsValida,
  lineaOrdenVacia,
  type LineaOrden,
} from './lineas-orden.component';

/**
 * Alta y edición de orden de compra (FLUJO-COMPRAS §3).
 *
 * El aviso del umbral no es adorno: si el total supera el configurado por la
 * empresa, la orden **no** nace `enviada` sino `pendiente_aprobacion`, y hasta
 * que alguien la apruebe no se le puede recibir mercancía. La API no expone el
 * umbral aquí, así que se anuncia el mecanismo sin la cifra — el valor concreto
 * está en la pestaña de Configuración.
 */
@Component({
  selector: 'app-orden-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, EntityComboComponent, LineasOrdenComponent],
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

      @if (!orden()) {
        <app-entity-combo
          etiqueta="Proveedor"
          tipo="proveedor"
          [valor]="proveedor()"
          (valorChange)="proveedor.set($event)"
          marcador="Buscar por razón social o RFC…"
        />
      }

      <app-lineas-orden [(lineas)]="lineas" />

      <p class="text-label-md text-on-surface-variant">
        Si el total supera el umbral de aprobación de la empresa, la orden quedará pendiente de
        aprobación y no admitirá recepciones hasta que se apruebe.
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
          {{ enviando() ? 'Guardando…' : 'Guardar orden' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class OrdenFormModal {
  readonly orden = input<OrdenCompra | null>(null);
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<OrdenCompraCreate>();
  readonly cerrar = output<void>();

  protected readonly proveedor = signal<OpcionCombo | null>(null);
  protected readonly lineas = signal<LineaOrden[]>([lineaOrdenVacia()]);

  protected readonly titulo = computed(() => {
    const existente = this.orden();
    return existente ? `Editar ${existente.folio}` : 'Nueva orden de compra';
  });

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly valido = computed(() => {
    const proveedorOk = this.orden() !== null || this.proveedor() !== null;
    return proveedorOk && this.lineas().length > 0 && this.lineas().every(lineaOrdenEsValida);
  });

  constructor() {
    const existente = this.orden();
    if (existente) {
      this.lineas.set(
        existente.lineas.map((linea) => ({
          producto: { id: linea.producto_id, etiqueta: linea.producto_id.slice(0, 8) },
          cantidad: linea.cantidad,
          costo: linea.costo_unitario,
        })),
      );
    }
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    this.guardar.emit({
      proveedor_id: this.proveedor()?.id ?? this.orden()?.proveedor_id ?? '',
      lineas: this.lineas().map((linea) => ({
        producto_id: linea.producto!.id,
        cantidad: linea.cantidad.trim(),
        costo_unitario: linea.costo.trim(),
      })),
    });
  }
}
