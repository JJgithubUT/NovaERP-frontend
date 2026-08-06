import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import type { EtapaOportunidad, Oportunidad, Paginated } from '../../../api/models';
import { VentasApi } from '../../../api/services/ventas.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { injectClienteNombres } from '../cliente-nombres';
import { ETAPAS, ETAPA_LABEL, siguienteEtapa } from '../ventas.labels';

/** Tope de tarjetas del tablero. Más allá, el kanban deja de ser legible. */
const MAX_TARJETAS = 100;

/**
 * Tablero kanban de oportunidades abiertas.
 *
 * Se arrastra una tarjeta a la columna siguiente para avanzar su etapa. La
 * regla de "solo a la siguiente" se comprueba **antes** de soltar: el backend
 * también la valida con un 422, pero rechazar el gesto en el acto explica mejor
 * por qué no se puede que un error después del hecho.
 *
 * El avance es optimista —la tarjeta se mueve al instante y se revierte si el
 * backend rechaza—, porque arrastrar y quedarse esperando a que la tarjeta
 * "salte" se siente roto.
 *
 * Arrastrar no es accesible por teclado, así que cada tarjeta lleva además un
 * botón de avanzar. Es la misma acción por otra vía, no un extra.
 *
 * Ojo con el origen de los datos: las columnas se arman agrupando
 * `/oportunidades/?estado=abierta` en el cliente. El endpoint
 * `/oportunidades/pipeline/` **no** sirve para esto — devuelve totales por
 * etapa, no las oportunidades—, así que se usa solo para la cifra ponderada de
 * la cabecera.
 */
@Component({
  selector: 'app-pipeline-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-sm text-on-surface">Pipeline comercial</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Arrastra una tarjeta a la etapa siguiente para avanzarla. Solo se muestran las
            oportunidades abiertas.
          </p>
        </div>

        @if (resumen.data(); as pipeline) {
          <div
            class="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-right"
          >
            <p class="text-label-caps uppercase text-on-surface-variant">Ponderado total</p>
            <p class="font-mono text-headline-sm font-bold text-action">
              {{ moneda(pipeline.valor_ponderado_total) }}
            </p>
          </div>
        }
      </div>

      @if (aviso(); as mensaje) {
        <p
          class="rounded border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      @if (consulta.isPending()) {
        <p class="py-8 text-center text-body-sm text-on-surface-variant">Cargando…</p>
      } @else if (consulta.isError()) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ error() }}
        </p>
      } @else {
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          @for (etapa of etapas; track etapa) {
            <section
              class="flex min-h-48 flex-col gap-2 rounded-lg border p-3 transition-colors"
              [class]="clasesColumna(etapa)"
              (dragover)="alArrastrarSobre($event, etapa)"
              (dragleave)="alSalir(etapa)"
              (drop)="alSoltar($event, etapa)"
            >
              <header class="flex items-baseline justify-between gap-2">
                <h3 class="text-label-caps uppercase text-on-surface-variant">
                  {{ etiquetaEtapa(etapa) }}
                </h3>
                <span class="text-label-md text-on-surface-variant">
                  {{ enEtapa(etapa).length }}
                </span>
              </header>

              @for (op of enEtapa(etapa); track op.id) {
                <article
                  draggable="true"
                  class="cursor-grab rounded border border-outline-variant bg-surface-container-lowest p-2.5 active:cursor-grabbing"
                  (dragstart)="alEmpezar($event, op)"
                  (dragend)="arrastrando.set(null)"
                >
                  <p class="text-body-sm font-medium text-on-surface">{{ op.nombre }}</p>
                  <p class="mt-0.5 text-label-md text-on-surface-variant">
                    {{ nombres.cliente(op.cliente_id) }}
                  </p>

                  <div class="mt-2 flex items-center justify-between gap-2">
                    <span class="font-mono text-label-md tabular-nums text-on-surface-variant">
                      {{ op.valor_estimado ? moneda(op.valor_estimado) : '—' }}
                    </span>

                    @if (proxima(op.etapa); as siguiente) {
                      <button
                        type="button"
                        class="btn-fila"
                        [disabled]="avance.isPending()"
                        [attr.aria-label]="
                          'Avanzar ' + op.nombre + ' a ' + etiquetaEtapa(siguiente)
                        "
                        (click)="avanzar(op, siguiente)"
                      >
                        <app-icon name="arrow_forward" [size]="14" />
                      </button>
                    }
                  </div>
                </article>
              } @empty {
                <p class="py-4 text-center text-label-md text-on-surface-variant">
                  Sin oportunidades
                </p>
              }
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class PipelinePage {
  private readonly api = inject(VentasApi);
  private readonly store = inject(AuthStore);
  private readonly queryClient = inject(QueryClient);
  private readonly toasts = inject(ToastService);

  protected readonly nombres = injectClienteNombres();
  protected readonly etapas = ETAPAS;

  protected readonly arrastrando = signal<Oportunidad | null>(null);
  protected readonly columnaActiva = signal<EtapaOportunidad | null>(null);
  protected readonly aviso = signal<string | null>(null);

  private readonly filtros = { estado: 'abierta' as const, page_size: MAX_TARJETAS };

  protected readonly consulta = injectQuery(() => ({
    queryKey: qk.lista(this.store.tenantSlug() ?? '', 'oportunidades', this.filtros),
    queryFn: () => this.api.listarOportunidades(this.filtros),
  }));

  /** Solo para la cifra de cabecera: este endpoint no devuelve las tarjetas. */
  protected readonly resumen = injectQuery(() => ({
    queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'pipeline'),
    queryFn: () => this.api.obtenerPipeline(),
  }));

  protected readonly avance = injectMutation(() => ({
    mutationFn: ({ id, etapa }: { id: string; etapa: EtapaOportunidad }) =>
      this.api.avanzarEtapa(id, etapa),

    /**
     * Mueve la tarjeta antes de que responda el backend y devuelve la lista
     * previa para poder deshacerlo. Se cancelan los refetch en vuelo: si uno
     * llegara a mitad, sobrescribiría el movimiento con datos ya viejos.
     */
    onMutate: async ({ id, etapa }: { id: string; etapa: EtapaOportunidad }) => {
      const clave = qk.lista(this.store.tenantSlug() ?? '', 'oportunidades', this.filtros);
      await this.queryClient.cancelQueries({ queryKey: clave });

      const previo = this.queryClient.getQueryData<Paginated<Oportunidad>>(clave);
      if (previo) {
        this.queryClient.setQueryData<Paginated<Oportunidad>>(clave, {
          ...previo,
          results: previo.results.map((op) => (op.id === id ? { ...op, etapa } : op)),
        });
      }

      return { previo, clave };
    },

    onError: (error: unknown, _variables, contexto) => {
      if (contexto?.previo) this.queryClient.setQueryData(contexto.clave, contexto.previo);
      this.toasts.error(mensajeDeError(error));
    },

    onSuccess: () => {
      void this.queryClient.invalidateQueries({
        queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'pipeline'),
      });
    },

    // Se resincroniza pase lo que pase: el backend recalcula `probabilidad` y
    // `valor_ponderado` al cambiar de etapa, y la copia optimista no los sabe.
    onSettled: () => {
      void this.queryClient.invalidateQueries({
        queryKey: qk.catalogo(this.store.tenantSlug() ?? '', 'oportunidades'),
      });
    },
  }));

  protected readonly moneda = formatMoneda;
  protected readonly proxima = siguienteEtapa;

  private readonly porEtapa = computed(() => {
    const mapa = new Map<EtapaOportunidad, Oportunidad[]>(ETAPAS.map((etapa) => [etapa, []]));
    for (const op of this.consulta.data()?.results ?? []) {
      mapa.get(op.etapa)?.push(op);
    }
    return mapa;
  });

  protected enEtapa(etapa: EtapaOportunidad): Oportunidad[] {
    return this.porEtapa().get(etapa) ?? [];
  }

  protected etiquetaEtapa(etapa: EtapaOportunidad): string {
    return ETAPA_LABEL[etapa];
  }

  protected error(): string {
    return mensajeDeError(this.consulta.error(), 'No se pudo cargar el pipeline.');
  }

  protected clasesColumna(etapa: EtapaOportunidad): string {
    return this.columnaActiva() === etapa && this.esDestinoValido(etapa)
      ? 'border-action bg-surface-container'
      : 'border-outline-variant bg-surface-container-low';
  }

  protected alEmpezar(evento: DragEvent, oportunidad: Oportunidad): void {
    this.arrastrando.set(oportunidad);
    this.aviso.set(null);
    // Firefox no inicia el arrastre si no se escribe algo en el dataTransfer.
    evento.dataTransfer?.setData('text/plain', oportunidad.id);
    if (evento.dataTransfer) evento.dataTransfer.effectAllowed = 'move';
  }

  protected alArrastrarSobre(evento: DragEvent, etapa: EtapaOportunidad): void {
    // Sin `preventDefault` el navegador no considera la columna una zona de
    // destino y nunca dispara `drop`.
    evento.preventDefault();
    this.columnaActiva.set(etapa);
    if (evento.dataTransfer) {
      evento.dataTransfer.dropEffect = this.esDestinoValido(etapa) ? 'move' : 'none';
    }
  }

  protected alSalir(etapa: EtapaOportunidad): void {
    if (this.columnaActiva() === etapa) this.columnaActiva.set(null);
  }

  protected alSoltar(evento: DragEvent, etapa: EtapaOportunidad): void {
    evento.preventDefault();
    this.columnaActiva.set(null);

    const oportunidad = this.arrastrando();
    this.arrastrando.set(null);
    if (!oportunidad || oportunidad.etapa === etapa) return;

    if (!this.esDestinoValido(etapa)) {
      this.aviso.set(
        'Una oportunidad solo avanza a la etapa siguiente: no se puede saltar ni retroceder.',
      );
      return;
    }

    this.avanzar(oportunidad, etapa);
  }

  protected avanzar(oportunidad: Oportunidad, etapa: EtapaOportunidad): void {
    this.aviso.set(null);
    this.avance.mutate({ id: oportunidad.id, etapa });
  }

  /** Destino válido = exactamente la etapa siguiente a la de la tarjeta. */
  private esDestinoValido(etapa: EtapaOportunidad): boolean {
    const oportunidad = this.arrastrando();
    return oportunidad !== null && siguienteEtapa(oportunidad.etapa) === etapa;
  }
}
