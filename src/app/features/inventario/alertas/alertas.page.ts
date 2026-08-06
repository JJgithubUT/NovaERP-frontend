import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT } from '../../../api/models';
import { InventarioApi } from '../../../api/services/inventario.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatCantidad } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { injectCatalogoNombres } from '../catalogo-nombres';

/** Valor del `<select>`: cadena vacía = sin filtro. */
type FiltroNotificada = '' | 'true' | 'false';

/**
 * Alertas de stock mínimo (RF-63).
 *
 * Las genera el backend: un movimiento que deja la existencia en o por debajo
 * del `stock_minimo` del producto dispara una. La API no las crea ni las borra;
 * lo único que se puede hacer desde aquí es marcarlas como notificadas.
 *
 * `cantidad_al_disparo` es una foto del momento, no la existencia actual: una
 * alerta vieja puede tener un número que ya no coincide con el stock de hoy, y
 * eso es correcto — dice cuánto había cuando saltó.
 */
@Component({
  selector: 'app-alertas-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, FilaMensajeComponent, PaginacionComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div
        class="flex items-start gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant"
      >
        <span>
          <strong class="font-semibold text-on-surface">Se generan solas:</strong>
          una salida o un ajuste que deja la existencia en el stock mínimo del producto, o por
          debajo, dispara una alerta automáticamente.
        </span>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Alertas de stock mínimo</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Productos que cayeron a existencia crítica.
          </p>
        </div>

        <select
          class="campo-control sm:w-48"
          aria-label="Filtrar por estado"
          [value]="filtro()"
          (change)="filtrar($event)"
        >
          <option value="">Todas</option>
          <option value="false">Pendientes</option>
          <option value="true">Notificadas</option>
        </select>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Disparada</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th class="num">Cantidad al disparo</th>
              <th>Estado</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="6">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="6" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (alerta of consulta.data()?.results ?? []; track alerta.id) {
                <tr>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(alerta.disparada_en) }}
                  </td>
                  <td>{{ nombres.producto(alerta.producto_id) }}</td>
                  <td class="tenue">{{ nombres.almacen(alerta.almacen_id) }}</td>
                  <td class="num font-bold text-warning">
                    {{ cantidad(alerta.cantidad_al_disparo) }}
                  </td>
                  <td>
                    <app-badge [tono]="alerta.notificada ? 'neutro' : 'aviso'">
                      {{ alerta.notificada ? 'Notificada' : 'Pendiente' }}
                    </app-badge>
                  </td>
                  <td class="text-right">
                    @if (!alerta.notificada) {
                      <button
                        type="button"
                        class="btn-fila"
                        [disabled]="notificando() === alerta.id"
                        (click)="notificar(alerta.id)"
                      >
                        {{ notificando() === alerta.id ? 'Marcando…' : 'Marcar notificada' }}
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  Todo el stock está por encima de su mínimo. No hay alertas.
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
  `,
})
export class AlertasPage {
  private readonly api = inject(InventarioApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectCatalogoNombres();

  protected readonly pagina = signal(1);
  protected readonly filtro = signal<FiltroNotificada>('');
  /** Id en vuelo, para deshabilitar solo el botón de esa fila. */
  protected readonly notificando = signal<number | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtro = this.filtro();
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      // `''` significa "todas", así que el parámetro no debe viajar.
      notificada: filtro === '' ? undefined : filtro === 'true',
    };

    return {
      queryKey: qk.lista(slug, 'alertas', filtros),
      queryFn: () => this.api.listarAlertas(filtros),
    };
  });

  protected readonly marcado = injectMutation(() => ({
    mutationFn: (id: number) => this.api.notificarAlerta(id),
    onSuccess: () => {
      const slug = this.store.tenantSlug() ?? '';
      void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'alertas') });
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
    onSettled: () => this.notificando.set(null),
  }));

  protected readonly cantidad = formatCantidad;
  protected readonly fechaHora = formatFechaHora;

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las alertas.');
  }

  protected filtrar(evento: Event): void {
    this.filtro.set((evento.target as HTMLSelectElement).value as FiltroNotificada);
    this.pagina.set(1);
  }

  protected notificar(id: number): void {
    this.notificando.set(id);
    this.marcado.mutate(id);
  }
}
