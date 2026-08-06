import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormatoExport } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { formatFechaHora } from '../../../shared/utils/fecha.util';

const PERMISO_EXPORTAR = 'ventas:reportes:exportar';

/**
 * Barra de filtros y exportación común a los seis reportes.
 *
 * Los tres avisos que pinta no son decoración; cada uno cambia cómo hay que
 * leer las cifras de abajo:
 *
 * - **`alcance_vendedor`** — si viene con valor, quien mira no tiene
 *   `ventas:pipeline:ver_todo` y el reporte se acotó a sus propias cifras,
 *   pidiera lo que pidiera. Sin decirlo, confundiría "la empresa vendió poco"
 *   con "yo vendí poco".
 * - **`nota`** — advertencia metodológica del backend (por ejemplo, que el
 *   ranking de productos es importe bruto porque una nota de crédito no tiene
 *   desglose por línea).
 * - **`generado_en`** — a qué momento corresponde lo que se está viendo.
 */
@Component({
  selector: 'app-reporte-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 class="text-headline-sm text-on-surface">{{ titulo() }}</h2>
          @if (descripcion()) {
            <p class="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
              {{ descripcion() }}
            </p>
          }
        </div>
        @if (generadoEn(); as momento) {
          <span class="text-label-md text-on-surface-variant">
            Generado: {{ fechaHora(momento) }}
          </span>
        }
      </div>

      <div
        class="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4"
      >
        @if (modo() === 'rango') {
          <div class="flex flex-col gap-1.5">
            <label class="text-label-caps uppercase text-on-surface-variant" for="rep-desde">
              Desde
            </label>
            <input
              id="rep-desde"
              type="date"
              class="campo-control"
              [value]="desde()"
              (change)="desde.set($any($event.target).value)"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-label-caps uppercase text-on-surface-variant" for="rep-hasta">
              Hasta
            </label>
            <input
              id="rep-hasta"
              type="date"
              class="campo-control"
              [value]="hasta()"
              (change)="hasta.set($any($event.target).value)"
            />
          </div>
        } @else {
          <div class="flex flex-col gap-1.5">
            <label class="text-label-caps uppercase text-on-surface-variant" for="rep-corte">
              Fecha de corte
            </label>
            <input
              id="rep-corte"
              type="date"
              class="campo-control"
              [value]="corte()"
              (change)="corte.set($any($event.target).value)"
            />
          </div>
        }

        <!-- Filtros propios de cada reporte (agrupación, orden, top…). -->
        <ng-content />

        <div class="ml-auto flex flex-wrap items-end gap-2">
          <button
            type="button"
            class="btn btn-primario"
            [disabled]="cargando() || !rangoValido()"
            (click)="buscar.emit()"
          >
            {{ cargando() ? 'Consultando…' : 'Consultar' }}
          </button>

          @if (puedeExportar()) {
            <button
              type="button"
              class="btn btn-secundario"
              [disabled]="exportando()"
              (click)="exportar.emit('csv')"
            >
              <app-icon name="download" [size]="16" />
              CSV
            </button>
            <button
              type="button"
              class="btn btn-secundario"
              [disabled]="exportando()"
              (click)="exportar.emit('pdf')"
            >
              <app-icon name="download" [size]="16" />
              PDF
            </button>
          }
        </div>
      </div>

      @if (!rangoValido()) {
        <p class="text-label-md text-error" role="alert">
          «Hasta» no puede ser anterior a «Desde», y el rango no puede exceder 366 días.
        </p>
      }

      @if (alcanceVendedor()) {
        <p
          class="rounded border border-outline-variant bg-tertiary-container px-3 py-2 text-body-sm text-on-tertiary-container"
        >
          <strong class="font-semibold">Vista personal:</strong>
          estás viendo solo tus propias cifras. No tienes permiso para consultar las de otros
          vendedores.
        </p>
      }

      @if (nota()) {
        <p
          class="rounded border border-outline-variant bg-warning-container px-3 py-2 text-body-sm text-on-warning-container"
        >
          <strong class="font-semibold">Nota:</strong> {{ nota() }}
        </p>
      }
    </div>
  `,
})
export class ReporteHeaderComponent {
  private readonly store = inject(AuthStore);

  readonly titulo = input.required<string>();
  readonly descripcion = input('');
  /** `rango` usa desde/hasta; `corte` es una foto a una fecha (solo Cartera). */
  readonly modo = input<'rango' | 'corte'>('rango');

  readonly desde = model('');
  readonly hasta = model('');
  readonly corte = model('');

  readonly cargando = input(false);
  readonly exportando = input(false);
  readonly nota = input<string | undefined>(undefined);
  readonly alcanceVendedor = input<string | null>(null);
  readonly generadoEn = input<string | undefined>(undefined);

  readonly buscar = output<void>();
  readonly exportar = output<FormatoExport>();

  protected readonly fechaHora = formatFechaHora;

  /**
   * Se ofrece exportar si el usuario tiene el permiso **o** si todavía no
   * sabemos qué permisos tiene.
   *
   * Lo segundo importa: `/api/core/me/` puede devolver `permisos` vacío aunque
   * el usuario tenga roles, si `rol_permiso` no está poblado (ver
   * `permission.guard.ts`). Ocultar el botón en ese caso se lo quitaría a todo
   * el mundo. Si de verdad falta el permiso, el backend responde 403 y la
   * página lo explica.
   */
  protected readonly puedeExportar = computed(() => {
    const permisos = this.store.me()?.permisos;
    const desconocidos = permisos === undefined || permisos.length === 0;
    return desconocidos || this.store.hasPermiso(PERMISO_EXPORTAR);
  });

  /** El backend rechaza un rango invertido o de más de 366 días. */
  protected readonly rangoValido = computed(() => {
    if (this.modo() === 'corte') return true;

    const desde = this.desde();
    const hasta = this.hasta();
    if (desde === '' || hasta === '') return false;
    if (hasta < desde) return false;

    const dias = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000;
    return dias <= 366;
  });
}
