import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { PAGE_SIZE_DEFAULT, type ActividadQuery, type UsuarioEstado } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { descargarBlob } from '../../../api/services/reportes.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { FilaMensajeComponent } from '../../../shared/ui/tabla/fila-mensaje.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { aFechaIso, formatFechaHora } from '../../../shared/utils/fecha.util';
import { ESTADO_USUARIO_LABEL, tonoUsuario } from '../administracion.labels';

/**
 * Reporte de actividad de usuarios (RF-23).
 *
 * `num_acciones_cud` cuenta solo altas, cambios y bajas auditadas **en el
 * rango**: no incluye consultas. Un usuario que se pasa el día leyendo informes
 * aparecerá con cero, y eso no significa que no trabaje — la columna dice
 * "acciones", no "actividad", justamente por eso.
 */
@Component({
  selector: 'app-actividad-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, FilaMensajeComponent, IconComponent, PaginacionComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Actividad de usuarios</h2>
          <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
            Último acceso, sesiones y acciones registradas por usuario.
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
        <input
          class="campo-control sm:w-44"
          placeholder="Departamento"
          aria-label="Filtrar por departamento"
          [value]="departamento()"
          (change)="filtrar('departamento', $event)"
        />
        <input
          class="campo-control sm:w-44"
          placeholder="Puesto"
          aria-label="Filtrar por puesto"
          [value]="puesto()"
          (change)="filtrar('puesto', $event)"
        />
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Departamento</th>
              <th>Puesto</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th class="num">Sesiones</th>
              <th class="num">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (consulta.isPending()) {
              <tr appFilaMensaje [columnas]="7">
                Cargando…
              </tr>
            } @else if (consulta.isError()) {
              <tr appFilaMensaje [columnas]="7" tono="error">
                {{
                  errorLista()
                }}
              </tr>
            } @else {
              @for (fila of consulta.data()?.results ?? []; track fila.usuario_id) {
                <tr>
                  <td>
                    <span class="block font-medium">{{ fila.nombre_completo }}</span>
                    <span class="block font-mono text-mono-sm text-on-surface-variant">
                      {{ fila.correo }}
                    </span>
                  </td>
                  <td class="tenue">{{ fila.departamento || '—' }}</td>
                  <td class="tenue">{{ fila.puesto || '—' }}</td>
                  <td>
                    <app-badge [tono]="tono(fila.estado)">
                      {{ etiquetaEstado(fila.estado) }}
                    </app-badge>
                  </td>
                  <td class="tenue whitespace-nowrap font-mono text-mono-sm">
                    {{ fila.ultimo_acceso ? fechaHora(fila.ultimo_acceso) : 'Nunca' }}
                  </td>
                  <td class="num tenue">{{ fila.num_sesiones }}</td>
                  <td class="num font-semibold">{{ fila.num_acciones_cud }}</td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="7">
                  Sin actividad en el rango elegido.
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
export class ActividadPage {
  private readonly api = inject(CoreApi);
  private readonly store = inject(AuthStore);
  private readonly toasts = inject(ToastService);

  protected readonly pagina = signal(1);
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly departamento = signal('');
  protected readonly puesto = signal('');

  protected readonly exportando = signal(false);

  private readonly filtros = () => ({
    desde: this.desde(),
    hasta: this.hasta(),
    departamento: this.departamento(),
    puesto: this.puesto(),
  });

  protected readonly consulta = injectQuery(() => {
    const filtros: ActividadQuery = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      ...this.filtros(),
    };

    return {
      queryKey: qk.lista(this.store.tenantSlug() ?? '', 'actividad', filtros),
      queryFn: () => this.api.reporteActividad(filtros),
    };
  });

  protected readonly fechaHora = formatFechaHora;
  protected readonly tono = tonoUsuario;

  protected etiquetaEstado(estado: UsuarioEstado): string {
    return ESTADO_USUARIO_LABEL[estado];
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar el reporte.');
  }

  protected filtrar(campo: 'desde' | 'hasta' | 'departamento' | 'puesto', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value.trim();
    ({
      desde: this.desde,
      hasta: this.hasta,
      departamento: this.departamento,
      puesto: this.puesto,
    })[campo].set(valor);
    this.pagina.set(1);
  }

  protected async exportar(formato: 'csv' | 'pdf'): Promise<void> {
    if (this.exportando()) return;
    this.exportando.set(true);

    try {
      const blob = await this.api.exportarActividad(this.filtros(), formato);
      descargarBlob(blob, `actividad-${aFechaIso(new Date())}.${formato}`);
    } catch (error) {
      this.toasts.error(
        isApiError(error) && error.status === 403
          ? 'No tienes permiso para exportar este reporte.'
          : mensajeDeError(error, 'No se pudo exportar el reporte.'),
      );
    } finally {
      this.exportando.set(false);
    }
  }
}
