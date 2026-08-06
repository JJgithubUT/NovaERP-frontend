import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { InventarioApi } from '../../../api/services/inventario.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { qk } from '../../../core/query/query-keys';
import type { Uuid } from '../../../api/models';
import { IconComponent } from '../icon/icon.component';

export interface OpcionCombo {
  id: Uuid;
  /** Texto ya compuesto (`SKU — Nombre`). Se guarda para no re-pedirlo al pintar. */
  etiqueta: string;
  detalle?: string;
}

const DEBOUNCE_MS = 250;
const MAX_OPCIONES = 10;

/**
 * Selector con búsqueda para elegir un producto o un almacén.
 *
 * Existe porque los formularios de movimiento, ajuste y transferencia piden
 * `producto_id` y `almacen_id` (UUID), pero nadie se sabe un UUID: hay que
 * buscar por SKU o por nombre y quedarse con el id por detrás.
 *
 * Solo ofrece registros `activo: true`. Dar de baja un producto es
 * precisamente decir "ya no se opera con él", así que dejar elegirlo aquí sería
 * empujar al usuario hacia un 422.
 */
@Component({
  selector: 'app-entity-combo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(document:mousedown)': 'alClicFuera($event)',
  },
  template: `
    <div class="flex flex-col gap-1.5">
      <label class="text-label-caps uppercase text-on-surface-variant">{{ etiqueta() }}</label>

      @if (valor(); as elegido) {
        <div
          class="flex items-center justify-between gap-2 rounded border border-primary-container/40 bg-surface-container px-3 py-2"
        >
          <span class="min-w-0 truncate text-body-md text-on-surface">{{ elegido.etiqueta }}</span>
          <button
            type="button"
            class="shrink-0 text-label-md font-semibold text-action hover:underline"
            (click)="limpiar()"
          >
            Cambiar
          </button>
        </div>
      } @else {
        <div class="relative">
          <div
            class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action"
          >
            <app-icon name="search" [size]="18" class="text-on-surface-variant" />
            <input
              type="text"
              class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
              [placeholder]="marcador()"
              [value]="texto()"
              (focus)="abierto.set(true)"
              (input)="alEscribir($event)"
            />
          </div>

          @if (abierto()) {
            <ul
              class="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded border border-outline-variant bg-surface-container-lowest shadow-lg"
            >
              @if (consulta.isPending()) {
                <li class="px-3 py-2 text-body-sm text-on-surface-variant">Buscando…</li>
              } @else if (consulta.isError()) {
                <li class="px-3 py-2 text-body-sm text-error">No se pudo buscar.</li>
              } @else {
                @for (opcion of consulta.data(); track opcion.id) {
                  <li>
                    <button
                      type="button"
                      class="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-surface-container"
                      (click)="elegir(opcion)"
                    >
                      <span class="text-body-md text-on-surface">{{ opcion.etiqueta }}</span>
                      @if (opcion.detalle) {
                        <span class="text-label-md text-on-surface-variant">{{
                          opcion.detalle
                        }}</span>
                      }
                    </button>
                  </li>
                } @empty {
                  <li class="px-3 py-2 text-body-sm text-on-surface-variant">Sin resultados.</li>
                }
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
})
export class EntityComboComponent {
  private readonly api = inject(InventarioApi);
  private readonly store = inject(AuthStore);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly etiqueta = input.required<string>();
  readonly tipo = input.required<'producto' | 'almacen'>();
  readonly marcador = input('Buscar…');

  readonly valor = model<OpcionCombo | null>(null);

  protected readonly texto = signal('');
  /** Signal, no propiedad: `enabled` de la query depende de él. */
  protected readonly abierto = signal(false);

  private readonly escrito$ = new Subject<string>();
  private readonly busqueda = toSignal(
    this.escrito$.pipe(debounceTime(DEBOUNCE_MS), distinctUntilChanged()),
    { initialValue: '' },
  );

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const recurso = this.tipo() === 'producto' ? 'productos' : 'almacenes';
    const filtros = { search: this.busqueda(), page_size: MAX_OPCIONES, activo: true };

    return {
      queryKey: qk.lista(slug, recurso, filtros),
      // Sin desplegar no hay nada que buscar; así abrir un formulario no
      // dispara dos peticiones que quizá nadie llegue a usar.
      enabled: this.abierto() && slug !== '',
      queryFn: () =>
        this.tipo() === 'producto'
          ? this.api.listarProductos(filtros).then((pagina) => pagina.results.map(aOpcionProducto))
          : this.api.listarAlmacenes(filtros).then((pagina) => pagina.results.map(aOpcionAlmacen)),
    };
  });

  protected alEscribir(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.texto.set(texto);
    this.abierto.set(true);
    this.escrito$.next(texto);
  }

  protected elegir(opcion: OpcionCombo): void {
    this.valor.set(opcion);
    this.abierto.set(false);
    this.texto.set('');
    this.escrito$.next('');
  }

  protected limpiar(): void {
    this.valor.set(null);
    this.abierto.set(false);
  }

  protected alClicFuera(evento: MouseEvent): void {
    if (!this.host.nativeElement.contains(evento.target as Node)) this.abierto.set(false);
  }
}

function aOpcionProducto(producto: { id: Uuid; sku: string; nombre: string }): OpcionCombo {
  return { id: producto.id, etiqueta: `${producto.sku} — ${producto.nombre}` };
}

function aOpcionAlmacen(almacen: {
  id: Uuid;
  nombre: string;
  ubicacion: string | null;
}): OpcionCombo {
  return { id: almacen.id, etiqueta: almacen.nombre, detalle: almacen.ubicacion ?? undefined };
}
