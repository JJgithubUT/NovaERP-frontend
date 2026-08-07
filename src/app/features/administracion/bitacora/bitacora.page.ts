import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type BitacoraQuery,
  type CriticidadEvento,
  type EventoAuditoria,
} from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { descargarBlob } from '../../../api/services/reportes.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { aFechaIso, formatFechaHora } from '../../../shared/utils/fecha.util';
import type { BadgeTono } from '../../../shared/ui/badge/badge.component';

const TONO_CRITICIDAD: Readonly<Record<CriticidadEvento, BadgeTono>> = {
  ALTA: 'error',
  NORMAL: 'info',
  BAJA: 'neutro',
};

/**
 * Bitácora de auditoría (solo lectura).
 *
 * No hay forma de editarla ni borrarla, y es el punto: una bitácora que se
 * puede retocar no sirve como evidencia. La propia exportación queda registrada
 * como un evento `EXPORT`.
 *
 * El detalle de cada evento (`valores_antes` / `valores_despues`) sale en un
 * diálogo aparte porque son objetos completos de la fila afectada: meterlos en
 * la tabla la haría ilegible, y omitirlos perdería justo lo que se audita.
 */
@Component({
  selector: 'app-bitacora-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    FilaMensajeComponent,
    IconComponent,
    ModalComponent,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Bitácora de auditoría</h2>
          <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
            Registro inalterable de lo que ha pasado en el sistema. Exportarla también queda
            registrado.
          </p>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-secundario"
            [disabled]="exportando()"
            (click)="exportar('csv')"
          >
            <app-icon name="download" [size]="16" />
            CSV
          </button>
          <button
            type="button"
            class="btn btn-secundario"
            [disabled]="exportando()"
            (click)="exportar('pdf')"
          >
            <app-icon name="download" [size]="16" />
            PDF
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <input
          class="campo-control sm:w-44"
          placeholder="Operación (LOGIN, CREATE…)"
          aria-label="Filtrar por operación"
          [value]="operacion()"
          (change)="filtrar('operacion', $event)"
        />
        <input
          class="campo-control sm:w-44"
          placeholder="Entidad"
          aria-label="Filtrar por entidad"
          [value]="entidad()"
          (change)="filtrar('entidad', $event)"
        />
        <input
          type="date"
          class="campo-control"
          aria-label="Desde"
          [value]="desde()"
          (change)="filtrar('desde', $event)"
        />
        <input
          type="date"
          class="campo-control"
          aria-label="Hasta"
          [value]="hasta()"
          (change)="filtrar('hasta', $event)"
        />
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Operación</th>
              <th>Entidad</th>
              <th>Criticidad</th>
              <th>IP</th>
              <th><span class="sr-only">Detalle</span></th>
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
              @for (evento of consulta.data()?.results ?? []; track evento.id) {
                <tr>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fechaHora(evento.ocurrido_en) }}
                  </td>
                  <td class="clave">{{ evento.operacion }}</td>
                  <td class="tenue">
                    {{ evento.entidad }}
                    <span class="block font-mono text-mono-sm">
                      {{ evento.entidad_id.slice(0, 8) }}
                    </span>
                  </td>
                  <td>
                    <app-badge [tono]="tono(evento.criticidad)">
                      {{ evento.criticidad }}
                    </app-badge>
                  </td>
                  <td class="clave tenue">{{ evento.ip_origen || '—' }}</td>
                  <td class="text-right">
                    @if (tieneDetalle(evento)) {
                      <button type="button" class="btn-fila" (click)="enDetalle.set(evento)">
                        Ver cambios
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="6">
                  Sin eventos en el rango elegido.
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

    @if (enDetalle(); as evento) {
      <app-modal
        [titulo]="evento.operacion + ' · ' + evento.entidad"
        ancho="lg"
        (cerrar)="enDetalle.set(null)"
      >
        <p class="text-body-sm text-on-surface-variant">
          {{ fechaHora(evento.ocurrido_en) }} · {{ evento.entidad_id }}
        </p>

        <div class="grid gap-4 sm:grid-cols-2">
          <section class="flex flex-col gap-2">
            <h3 class="text-label-caps uppercase text-on-surface-variant">Antes</h3>
            <pre
              class="max-h-72 overflow-auto rounded border border-outline-variant bg-surface-container p-3 font-mono text-mono-sm text-on-surface"
              >{{ formatear(evento.valores_antes) }}</pre>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="text-label-caps uppercase text-on-surface-variant">Después</h3>
            <pre
              class="max-h-72 overflow-auto rounded border border-outline-variant bg-surface-container p-3 font-mono text-mono-sm text-on-surface"
              >{{ formatear(evento.valores_despues) }}</pre>
          </section>
        </div>

        <div footer>
          <button type="button" class="btn btn-secundario" (click)="enDetalle.set(null)">
            Cerrar
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class BitacoraPage {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly operacion = signal('');
  protected readonly entidad = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  protected readonly enDetalle = signal<EventoAuditoria | null>(null);
  protected readonly exportando = signal(false);

  private readonly filtros = () => ({
    operacion: this.operacion(),
    entidad: this.entidad(),
    desde: this.desde(),
    hasta: this.hasta(),
  });

  protected readonly consulta = injectQuery(() => {
    const filtros: BitacoraQuery = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      ...this.filtros(),
    };

    return {
      queryKey: qk.lista(this.store.tenantSlug() ?? '', 'bitacora', filtros),
      queryFn: () => this.api.bitacora(filtros),
    };
  });

  protected readonly fechaHora = formatFechaHora;

  protected tono(criticidad: CriticidadEvento): BadgeTono {
    return TONO_CRITICIDAD[criticidad];
  }

  /** Los eventos de sesión (LOGIN…) no traen filas: no hay nada que enseñar. */
  protected tieneDetalle(evento: EventoAuditoria): boolean {
    return evento.valores_antes !== null || evento.valores_despues !== null;
  }

  protected formatear(valores: Record<string, unknown> | null): string {
    return valores === null ? '—' : JSON.stringify(valores, null, 2);
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar la bitácora.');
  }

  protected filtrar(campo: 'operacion' | 'entidad' | 'desde' | 'hasta', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value.trim();
    ({ operacion: this.operacion, entidad: this.entidad, desde: this.desde, hasta: this.hasta })[
      campo
    ].set(valor);
    this.pagina.set(1);
  }

  protected async exportar(formato: 'csv' | 'pdf'): Promise<void> {
    if (this.exportando()) return;
    this.exportando.set(true);

    try {
      const blob = await this.api.exportarBitacora(this.filtros(), formato);
      descargarBlob(blob, `bitacora-${aFechaIso(new Date())}.${formato}`);
    } catch (error) {
      this.toasts.error(
        isApiError(error) && error.status === 403
          ? 'No tienes el permiso core:bitacora:exportar.'
          : mensajeDeError(error, 'No se pudo exportar la bitácora.'),
      );
    } finally {
      this.exportando.set(false);
    }
  }
}
