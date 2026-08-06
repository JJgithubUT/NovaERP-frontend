import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ComprasApi } from '../../api/services/compras.api';
import { InventarioApi } from '../../api/services/inventario.api';
import { VentasApi } from '../../api/services/ventas.api';
import { AuthStore } from '../../core/auth/auth.store';
import { NetworkStatusService } from '../../core/offline/network-status.service';
import { SyncQueueService } from '../../core/offline/sync-queue.service';
import { qk } from '../../core/query/query-keys';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { formatMoneda } from '../../shared/utils/decimal.util';
import { construirNavegacion } from '../../layout/navigation';

/**
 * Solo hace falta el `count` del sobre, no las filas. Pedir una por página es
 * la forma de obtenerlo sin descargar veinte registros que nadie va a mirar.
 */
const SOLO_CONTEO = { page_size: 1 } as const;

/**
 * Panel de inicio.
 *
 * Todas las cifras salen del backend: los `count` del sobre paginado y el
 * `valor_ponderado_total` que calcula `/oportunidades/pipeline/`. Ninguna se
 * calcula sumando la primera página en el cliente, que es lo que hacía la
 * versión React — con 500 clientes mostraba "20", porque contaba el largo del
 * array recibido en vez del `count` real.
 *
 * Cada tarjeta se pide solo si el tenant tiene el módulo correspondiente. Un
 * tenant sin Compras no dispara la consulta de órdenes ni ve su hueco vacío.
 *
 * El panel de estado reporta lo que la app **sabe de verdad**: si hay red y
 * cuántos cambios esperan en la cola de sincronización. La plantilla original
 * traía un "Conexión con base de datos: En línea" fijo en el HTML, que afirma
 * algo que nadie comprobó.
 */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink],
  template: `
    <section class="flex flex-col gap-6">
      <header
        class="gradient-guinda flex flex-wrap items-end justify-between gap-4 rounded-lg px-6 py-6"
      >
        <div>
          <h1 class="text-display-lg">Hola, {{ store.usuario()?.nombre_completo ?? 'usuario' }}</h1>
          <p class="mt-1 text-body-md opacity-90">
            {{ store.tenant()?.razon_social }} · plan {{ store.tenant()?.plan }}
          </p>
        </div>

        <p class="text-label-md opacity-90">
          {{ store.roles().length ? store.roles().join(' · ') : 'Sin roles asignados' }}
        </p>
      </header>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (tarjeta of tarjetas(); track tarjeta.label) {
          <a
            [routerLink]="tarjeta.link"
            class="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:border-action"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                class="flex h-10 w-10 items-center justify-center rounded-md bg-surface-container-high text-action"
              >
                <app-icon [name]="tarjeta.icono" [size]="20" />
              </span>
              @if (tarjeta.destacar) {
                <span
                  class="rounded-full bg-warning-container px-2.5 py-0.5 text-label-caps uppercase text-on-warning-container"
                >
                  Requiere atención
                </span>
              }
            </div>

            <p class="text-label-caps uppercase text-on-surface-variant">{{ tarjeta.label }}</p>
            <p class="font-mono text-display-lg leading-none tabular-nums text-on-surface">
              {{ tarjeta.valor }}
            </p>
            <p class="text-label-md text-on-surface-variant">{{ tarjeta.detalle }}</p>
          </a>
        } @empty {
          <p class="text-body-sm text-on-surface-variant">
            Tu empresa no tiene módulos habilitados todavía.
          </p>
        }
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        <section
          class="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-2"
        >
          <h2 class="text-headline-sm text-on-surface">Módulos habilitados</h2>
          <p class="mt-0.5 text-body-sm text-on-surface-variant">
            Solo aparecen los que tu empresa tiene contratados.
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            @for (modulo of modulos(); track modulo.codigo) {
              <a
                [routerLink]="modulo.link"
                class="flex items-center gap-3 rounded-md border border-outline-variant p-4 transition-colors hover:border-action hover:bg-surface-container"
              >
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-md bg-surface-container-high text-action"
                >
                  <app-icon [name]="modulo.icon" [size]="18" />
                </span>
                <div class="min-w-0">
                  <p class="text-body-md font-semibold text-on-surface">{{ modulo.label }}</p>
                  <p class="truncate text-label-md text-on-surface-variant">
                    {{ descripcion(modulo.codigo) }}
                  </p>
                </div>
              </a>
            } @empty {
              <p class="text-body-sm text-on-surface-variant">Sin módulos habilitados.</p>
            }
          </div>
        </section>

        <section class="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <h2 class="text-headline-sm text-on-surface">Estado de la sesión</h2>

          <dl class="mt-4 flex flex-col gap-1">
            <div
              class="flex items-center justify-between gap-3 border-b border-outline-variant py-2"
            >
              <dt class="text-body-sm text-on-surface-variant">Conexión</dt>
              <dd class="flex items-center gap-1.5 text-body-sm font-semibold">
                <span
                  class="h-2 w-2 rounded-full"
                  [class]="red.online() ? 'bg-success' : 'bg-error'"
                ></span>
                {{ red.online() ? 'En línea' : 'Sin conexión' }}
              </dd>
            </div>

            <div
              class="flex items-center justify-between gap-3 border-b border-outline-variant py-2"
            >
              <dt class="text-body-sm text-on-surface-variant">Cambios sin sincronizar</dt>
              <dd class="font-mono text-body-sm font-semibold tabular-nums">
                {{ pendientes() }}
              </dd>
            </div>

            <div class="flex items-center justify-between gap-3 py-2">
              <dt class="text-body-sm text-on-surface-variant">Empresa</dt>
              <dd class="font-mono text-body-sm">{{ store.tenantSlug() ?? '—' }}</dd>
            </div>
          </dl>

          @if (!red.online()) {
            <p class="mt-4 text-label-md text-on-surface-variant">
              Puedes seguir trabajando: los cambios se guardan y se enviarán al reconectar.
            </p>
          }
        </section>
      </div>
    </section>
  `,
})
export class InicioPage {
  protected readonly store = inject(AuthStore);
  protected readonly red = inject(NetworkStatusService);

  private readonly ventas = inject(VentasApi);
  private readonly inventario = inject(InventarioApi);
  private readonly compras = inject(ComprasApi);
  private readonly cola = inject(SyncQueueService);

  private readonly slug = computed(() => this.store.tenantSlug() ?? '');

  private readonly tieneVentas = computed(() => this.store.hasModulo('VENTAS'));
  private readonly tieneInventario = computed(() => this.store.hasModulo('INVENTARIO'));
  private readonly tieneCompras = computed(() => this.store.hasModulo('COMPRAS'));

  protected readonly modulos = computed(() =>
    construirNavegacion(this.store.modulos(), this.slug()),
  );

  protected readonly pendientes = computed(() => this.cola.pendientes().length);

  private readonly clientes = injectQuery(() => ({
    queryKey: qk.lista(this.slug(), 'clientes', { ...SOLO_CONTEO, activo: true }),
    enabled: this.tieneVentas() && this.slug() !== '',
    queryFn: () => this.ventas.listarClientes({ ...SOLO_CONTEO, activo: true }),
  }));

  private readonly oportunidades = injectQuery(() => ({
    queryKey: qk.lista(this.slug(), 'oportunidades', { ...SOLO_CONTEO, estado: 'abierta' }),
    enabled: this.tieneVentas() && this.slug() !== '',
    queryFn: () => this.ventas.listarOportunidades({ ...SOLO_CONTEO, estado: 'abierta' }),
  }));

  private readonly pipeline = injectQuery(() => ({
    queryKey: qk.catalogo(this.slug(), 'pipeline'),
    enabled: this.tieneVentas() && this.slug() !== '',
    queryFn: () => this.ventas.obtenerPipeline(),
  }));

  private readonly alertas = injectQuery(() => ({
    queryKey: qk.lista(this.slug(), 'alertas', { ...SOLO_CONTEO, notificada: false }),
    enabled: this.tieneInventario() && this.slug() !== '',
    queryFn: () => this.inventario.listarAlertas({ ...SOLO_CONTEO, notificada: false }),
  }));

  private readonly ordenesPorAprobar = injectQuery(() => ({
    queryKey: qk.lista(this.slug(), 'ordenes-compra', {
      ...SOLO_CONTEO,
      estado: 'pendiente_aprobacion',
    }),
    enabled: this.tieneCompras() && this.slug() !== '',
    queryFn: () => this.compras.listarOrdenes({ ...SOLO_CONTEO, estado: 'pendiente_aprobacion' }),
  }));

  protected readonly tarjetas = computed(() => {
    const slug = this.slug();
    const tarjetas: Tarjeta[] = [];

    if (this.tieneVentas()) {
      tarjetas.push(
        {
          label: 'Clientes activos',
          icono: 'group',
          valor: conteo(this.clientes.data()?.count),
          detalle: 'Dados de alta y operables',
          link: ['/', slug, 'ventas', 'clientes'],
        },
        {
          label: 'Oportunidades abiertas',
          icono: 'trending_up',
          valor: conteo(this.oportunidades.data()?.count),
          detalle: 'Negociaciones aún sin cerrar',
          link: ['/', slug, 'ventas', 'oportunidades'],
        },
        {
          label: 'Pipeline ponderado',
          icono: 'payments',
          // Ponderado y no valor bruto: es el que aplica la probabilidad de
          // cada etapa, y lo calcula el backend.
          valor: this.pipeline.data()
            ? formatMoneda(this.pipeline.data()!.valor_ponderado_total)
            : '—',
          detalle: 'Valor esperado según la etapa de cada oportunidad',
          link: ['/', slug, 'ventas', 'pipeline'],
        },
      );
    }

    if (this.tieneInventario()) {
      const alertas = this.alertas.data()?.count ?? 0;
      tarjetas.push({
        label: 'Alertas de stock',
        icono: 'warning',
        valor: conteo(this.alertas.data()?.count),
        detalle: 'Productos en su mínimo o por debajo, sin notificar',
        link: ['/', slug, 'inventario', 'alertas'],
        destacar: alertas > 0,
      });
    }

    if (this.tieneCompras()) {
      const porAprobar = this.ordenesPorAprobar.data()?.count ?? 0;
      tarjetas.push({
        label: 'Órdenes por aprobar',
        icono: 'local_shipping',
        valor: conteo(this.ordenesPorAprobar.data()?.count),
        detalle: 'Superan el umbral y bloquean su recepción',
        link: ['/', slug, 'compras', 'ordenes'],
        destacar: porAprobar > 0,
      });
    }

    return tarjetas;
  });

  protected descripcion(codigo: string): string {
    return DESCRIPCIONES[codigo] ?? 'Módulo del sistema';
  }
}

interface Tarjeta {
  label: string;
  icono: string;
  valor: string;
  detalle: string;
  link: readonly string[];
  /** Resalta la tarjeta cuando el número exige que alguien haga algo. */
  destacar?: boolean;
}

/** `—` mientras la consulta no ha respondido: un 0 prematuro sería mentira. */
function conteo(valor: number | undefined): string {
  return valor === undefined ? '—' : String(valor);
}

const DESCRIPCIONES: Readonly<Record<string, string>> = {
  VENTAS: 'Clientes, pipeline, cotizaciones, pedidos y facturas',
  INVENTARIO: 'Existencias, almacenes, movimientos y kardex',
  COMPRAS: 'Proveedores, órdenes, recepciones y cuentas por pagar',
};
