import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type Cotizacion,
  type CotizacionCreate,
  type EstadoCotizacion,
} from '../../../api/models';
import { VentasApi } from '../../../api/services/ventas.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { injectClienteNombres } from '../cliente-nombres';
import {
  ESTADO_COTIZACION_LABEL,
  cotizacionEsAprobable,
  cotizacionEsEditable,
  cotizacionEsResoluble,
  tonoCotizacion,
} from '../ventas.labels';
import { CotizacionFormModal } from './cotizacion-form.modal';

/**
 * Cotizaciones (FLUJO-VENTAS §3).
 *
 * `vencida` es un derivado de `vigente_hasta`, no un estado: una cotización
 * puede estar en `borrador` y vencida a la vez. Cuando eso pasa solo se ofrece
 * rechazarla — aprobar una vencida da 422 —, y la tabla lo marca con su propia
 * etiqueta para que la razón de que falte el botón sea visible.
 */
@Component({
  selector: 'app-cotizaciones-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    CotizacionFormModal,
    FilaMensajeComponent,
    IconComponent,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Cotizaciones</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Un descuento por encima del máximo de la empresa nace pendiente de aprobación.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nueva cotización
        </button>
      </div>

      <div class="flex flex-wrap gap-3">
        <select
          class="campo-control sm:w-56"
          aria-label="Filtrar por estado"
          [value]="estado()"
          (change)="filtrarEstado($event)"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="pendiente_aprobacion">Pendiente de aprobación</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>

        <label
          class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2 text-body-sm"
        >
          <input type="checkbox" [checked]="soloVencidas()" (change)="alternarVencidas($event)" />
          Solo vencidas sin resolver
        </label>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th class="num">Subtotal</th>
              <th class="num">Desc. %</th>
              <th class="num">Total</th>
              <th>Vigente hasta</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="8">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="8" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (cot of consulta.data()?.results ?? []; track cot.id) {
                <tr>
                  <td class="clave">{{ cot.folio }}</td>
                  <td class="tenue">{{ nombres.cliente(cot.cliente_id) }}</td>
                  <td class="flex flex-wrap items-center gap-1">
                    <app-badge [tono]="tono(cot.estado)">
                      {{ etiquetaEstado(cot.estado) }}
                    </app-badge>
                    @if (cot.vencida) {
                      <app-badge tono="error">Vencida</app-badge>
                    }
                  </td>
                  <td class="num tenue">{{ moneda(cot.subtotal) }}</td>
                  <td class="num tenue">{{ cot.descuento_pct }}</td>
                  <td class="num font-semibold">{{ moneda(cot.total) }}</td>
                  <td class="tenue whitespace-nowrap">{{ fecha(cot.vigente_hasta) }}</td>
                  <td>
                    <div class="flex justify-end gap-1.5">
                      @if (esEditable(cot.estado)) {
                        <button type="button" class="btn-fila" (click)="abrirEdicion(cot)">
                          Editar
                        </button>
                      }
                      @if (esAprobable(cot.estado, cot.vencida)) {
                        <button
                          type="button"
                          class="btn-fila"
                          [disabled]="resolucion.isPending()"
                          (click)="resolver(cot, 'aprobar')"
                        >
                          Aprobar
                        </button>
                      }
                      @if (esResoluble(cot.estado)) {
                        <button
                          type="button"
                          class="btn-fila"
                          [disabled]="resolucion.isPending()"
                          (click)="resolver(cot, 'rechazar')"
                        >
                          Rechazar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="8">
                  No hay cotizaciones. Genera la primera con «Nueva cotización».
                </tr>
              }
            }
          </tbody>
        </table>

        <app-paginacion
          [page]="pagina()"
          [count]="consulta.data()?.count ?? 0"
          [numPages]="consulta.data()?.num_pages ?? 1"
          (pageChange)="pagina.set($event)"
        />
      </div>
    </div>

    @if (modalAbierto()) {
      <app-cotizacion-form-modal
        [cotizacion]="enEdicion()"
        [enviando]="guardado.isPending()"
        [error]="guardado.error()"
        (guardar)="guardar($event)"
        (cerrar)="cerrarModal()"
      />
    }
  `,
})
export class CotizacionesPage {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectClienteNombres();

  protected readonly pagina = signal(1);
  protected readonly estado = signal<EstadoCotizacion | ''>('');
  protected readonly soloVencidas = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Cotizacion | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      estado: this.estado() || undefined,
      vencida: this.soloVencidas() ? true : undefined,
    };

    return {
      queryKey: qk.lista(slug, 'cotizaciones', filtros),
      queryFn: () => this.api.listarCotizaciones(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: CotizacionCreate) => {
      const existente = this.enEdicion();
      // El PATCH no acepta `cliente_id`; solo descuento, vigencia y líneas.
      return existente
        ? this.api.editarCotizacion(existente.id, {
            descuento_pct: datos.descuento_pct,
            vigente_hasta: datos.vigente_hasta,
            lineas: datos.lineas,
          })
        : this.api.crearCotizacion(datos);
    },
    onSuccess: (cotizacion) => {
      this.toasts.exito(
        cotizacion.estado === 'pendiente_aprobacion'
          ? `${cotizacion.folio} quedó pendiente de aprobación por el descuento.`
          : `Cotización ${cotizacion.folio} guardada.`,
      );
      this.refrescar();
      this.cerrarModal();
    },
  }));

  protected readonly resolucion = injectMutation(() => ({
    mutationFn: ({ id, decision }: { id: string; decision: 'aprobar' | 'rechazar' }) =>
      this.api.resolverCotizacion(id, { decision }),
    onSuccess: (cotizacion) => {
      this.toasts.exito(
        cotizacion.estado === 'aprobada'
          ? `${cotizacion.folio} aprobada. Ya se puede convertir en pedido.`
          : `${cotizacion.folio} rechazada.`,
      );
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  protected readonly moneda = formatMoneda;
  protected readonly fecha = formatFecha;
  protected readonly tono = tonoCotizacion;
  protected readonly esEditable = cotizacionEsEditable;
  protected readonly esResoluble = cotizacionEsResoluble;
  protected readonly esAprobable = cotizacionEsAprobable;

  protected etiquetaEstado(estado: EstadoCotizacion): string {
    return ESTADO_COTIZACION_LABEL[estado];
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las cotizaciones.');
  }

  protected filtrarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoCotizacion | '');
    this.pagina.set(1);
  }

  protected alternarVencidas(evento: Event): void {
    this.soloVencidas.set((evento.target as HTMLInputElement).checked);
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirEdicion(cotizacion: Cotizacion): void {
    this.enEdicion.set(cotizacion);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: CotizacionCreate): void {
    this.guardado.mutate(datos);
  }

  protected resolver(cotizacion: Cotizacion, decision: 'aprobar' | 'rechazar'): void {
    this.resolucion.mutate({ id: cotizacion.id, decision });
  }

  private refrescar(): void {
    void this.queryClient.invalidateQueries({
      queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'cotizaciones'),
    });
  }
}
