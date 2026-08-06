import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PAGE_SIZE_DEFAULT,
  type CierreOportunidad,
  type EstadoOportunidad,
  type EtapaOportunidad,
  type Oportunidad,
  type OportunidadCreate,
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
  ESTADO_OPORTUNIDAD_LABEL,
  ETAPAS,
  ETAPA_LABEL,
  siguienteEtapa,
  tonoOportunidad,
} from '../ventas.labels';
import { CerrarOportunidadModal } from './cerrar-oportunidad.modal';
import { OportunidadFormModal } from './oportunidad-form.modal';

/**
 * Oportunidades del pipeline (FLUJO-VENTAS §2).
 *
 * Las dos reglas que gobiernan los botones de cada fila:
 *
 * - **La etapa solo avanza a la siguiente.** El botón muestra a cuál va y
 *   desaparece en `cierre`; no hay forma de saltar ni de retroceder.
 * - **El cierre es terminal.** Una vez ganada o perdida, la fila no ofrece
 *   ninguna acción más.
 *
 * Ambas las valida el backend con 422; aquí solo se evita ofrecer lo imposible.
 */
@Component({
  selector: 'app-oportunidades-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    CerrarOportunidadModal,
    FilaMensajeComponent,
    IconComponent,
    OportunidadFormModal,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Oportunidades</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Si no tienes permiso para ver todo el pipeline, solo verás las tuyas.
          </p>
        </div>

        <button type="button" class="btn btn-primario" (click)="abrirAlta()">
          <app-icon name="add" [size]="18" />
          Nueva oportunidad
        </button>
      </div>

      <div class="flex flex-wrap gap-3">
        <select
          class="campo-control sm:w-44"
          aria-label="Filtrar por estado"
          [value]="estado()"
          (change)="filtrarEstado($event)"
        >
          <option value="">Todos los estados</option>
          <option value="abierta">Abiertas</option>
          <option value="ganada">Ganadas</option>
          <option value="perdida">Perdidas</option>
        </select>

        <select
          class="campo-control sm:w-52"
          aria-label="Filtrar por etapa"
          [value]="etapa()"
          (change)="filtrarEtapa($event)"
        >
          <option value="">Todas las etapas</option>
          @for (valor of etapas; track valor) {
            <option [value]="valor">{{ etiquetaEtapa(valor) }}</option>
          }
        </select>
      </div>

      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Oportunidad</th>
              <th>Cliente</th>
              <th>Etapa</th>
              <th>Estado</th>
              <th class="num">Valor</th>
              <th class="num">Ponderado</th>
              <th>Cierre est.</th>
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
              @for (op of consulta.data()?.results ?? []; track op.id) {
                <tr>
                  <td class="font-medium">{{ op.nombre }}</td>
                  <td class="tenue">{{ nombres.cliente(op.cliente_id) }}</td>
                  <td>
                    <span class="text-label-md">{{ etiquetaEtapa(op.etapa) }}</span>
                    <span class="tenue ml-1 text-label-md">({{ op.probabilidad }}%)</span>
                  </td>
                  <td>
                    <app-badge [tono]="tono(op.estado)">
                      {{ etiquetaEstado(op.estado) }}
                    </app-badge>
                    @if (op.motivo_perdida) {
                      <span class="tenue ml-1 text-label-md">· {{ op.motivo_perdida }}</span>
                    }
                  </td>
                  <td class="num tenue">
                    {{ op.valor_estimado ? moneda(op.valor_estimado) : '—' }}
                  </td>
                  <td class="num font-semibold">{{ moneda(op.valor_ponderado) }}</td>
                  <td class="tenue whitespace-nowrap">
                    {{ fecha(op.fecha_cierre_estimada) }}
                  </td>
                  <td>
                    @if (op.estado === 'abierta') {
                      <div class="flex justify-end gap-1.5">
                        <button type="button" class="btn-fila" (click)="abrirEdicion(op)">
                          Editar
                        </button>

                        @if (proxima(op.etapa); as siguiente) {
                          <button
                            type="button"
                            class="btn-fila"
                            [disabled]="avance.isPending()"
                            (click)="avanzar(op, siguiente)"
                          >
                            <app-icon name="arrow_forward" [size]="14" />
                            {{ etiquetaEtapa(siguiente) }}
                          </button>
                        }

                        <button type="button" class="btn-fila" (click)="abrirCierre(op)">
                          Cerrar
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr appFilaMensaje [columnas]="8">
                  No hay oportunidades. Registra la primera con «Nueva oportunidad».
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
      <app-oportunidad-form-modal
        [oportunidad]="enEdicion()"
        [enviando]="guardado.isPending()"
        [error]="guardado.error()"
        (guardar)="guardar($event)"
        (cerrar)="cerrarModal()"
      />
    }

    @if (enCierre(); as objetivo) {
      <app-cerrar-oportunidad-modal
        [oportunidad]="objetivo"
        [enviando]="cierre.isPending()"
        [error]="cierre.error()"
        (confirmar)="confirmarCierre($event)"
        (cerrar)="enCierre.set(null)"
      />
    }
  `,
})
export class OportunidadesPage {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectClienteNombres();
  protected readonly etapas = ETAPAS;

  protected readonly pagina = signal(1);
  protected readonly estado = signal<EstadoOportunidad | ''>('');
  protected readonly etapa = signal<EtapaOportunidad | ''>('');

  protected readonly modalAbierto = signal(false);
  protected readonly enEdicion = signal<Oportunidad | null>(null);
  protected readonly enCierre = signal<Oportunidad | null>(null);

  protected readonly consulta = injectQuery(() => {
    const slug = this.store.tenantSlug() ?? '';
    const filtros = {
      page: this.pagina(),
      page_size: PAGE_SIZE_DEFAULT,
      estado: this.estado() || undefined,
      etapa: this.etapa() || undefined,
    };

    return {
      queryKey: qk.lista(slug, 'oportunidades', filtros),
      queryFn: () => this.api.listarOportunidades(filtros),
    };
  });

  protected readonly guardado = injectMutation(() => ({
    mutationFn: (datos: OportunidadCreate) => {
      const existente = this.enEdicion();
      // El PATCH no acepta `cliente_id`: mandarlo daría un 400.
      return existente
        ? this.api.editarOportunidad(existente.id, {
            nombre: datos.nombre,
            valor_estimado: datos.valor_estimado,
            fecha_cierre_estimada: datos.fecha_cierre_estimada,
          })
        : this.api.crearOportunidad(datos);
    },
    onSuccess: () => {
      this.toasts.exito(this.enEdicion() ? 'Oportunidad actualizada.' : 'Oportunidad creada.');
      this.refrescar();
      this.cerrarModal();
    },
  }));

  protected readonly avance = injectMutation(() => ({
    mutationFn: ({ id, etapa }: { id: string; etapa: EtapaOportunidad }) =>
      this.api.avanzarEtapa(id, etapa),
    onSuccess: (oportunidad) => {
      this.toasts.exito(`Etapa avanzada a ${ETAPA_LABEL[oportunidad.etapa]}.`);
      this.refrescar();
    },
    onError: (error: unknown) => this.toasts.error(mensajeDeError(error)),
  }));

  protected readonly cierre = injectMutation(() => ({
    mutationFn: (datos: CierreOportunidad) =>
      this.api.cerrarOportunidad(this.enCierre()!.id, datos),
    onSuccess: (oportunidad) => {
      this.toasts.exito(
        oportunidad.estado === 'ganada'
          ? 'Oportunidad ganada.'
          : 'Oportunidad marcada como perdida.',
      );
      this.refrescar();
      this.enCierre.set(null);
    },
  }));

  protected readonly moneda = formatMoneda;
  protected readonly fecha = formatFecha;
  protected readonly tono = tonoOportunidad;
  protected readonly proxima = siguienteEtapa;

  protected etiquetaEtapa(etapa: EtapaOportunidad): string {
    return ETAPA_LABEL[etapa];
  }

  protected etiquetaEstado(estado: EstadoOportunidad): string {
    return ESTADO_OPORTUNIDAD_LABEL[estado];
  }

  protected errorLista(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudieron cargar las oportunidades.');
  }

  protected filtrarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoOportunidad | '');
    this.pagina.set(1);
  }

  protected filtrarEtapa(evento: Event): void {
    this.etapa.set((evento.target as HTMLSelectElement).value as EtapaOportunidad | '');
    this.pagina.set(1);
  }

  protected abrirAlta(): void {
    this.enEdicion.set(null);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirEdicion(oportunidad: Oportunidad): void {
    this.enEdicion.set(oportunidad);
    this.guardado.reset();
    this.modalAbierto.set(true);
  }

  protected abrirCierre(oportunidad: Oportunidad): void {
    this.cierre.reset();
    this.enCierre.set(oportunidad);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.enEdicion.set(null);
  }

  protected guardar(datos: OportunidadCreate): void {
    this.guardado.mutate(datos);
  }

  protected avanzar(oportunidad: Oportunidad, etapa: EtapaOportunidad): void {
    this.avance.mutate({ id: oportunidad.id, etapa });
  }

  protected confirmarCierre(datos: CierreOportunidad): void {
    this.cierre.mutate(datos);
  }

  /** El pipeline es un agregado de esto mismo: se queda obsoleto a la vez. */
  private refrescar(): void {
    const slug = this.store.tenantSlug() ?? '';
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'oportunidades') });
    void this.queryClient.invalidateQueries({ queryKey: qk.catalogo(slug, 'pipeline') });
  }
}
