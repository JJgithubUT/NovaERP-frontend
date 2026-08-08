import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { TenantDetalle, TenantUpdate } from '../../../api/models';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { CatalogoPlataforma } from '../../../core/plataforma/catalogo.store';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { etiquetaFase } from '../plataforma.labels';

/**
 * Módulos activos de una organización (RF-03).
 *
 * Las tres reglas del backend se reflejan en el estado de cada casilla, con su
 * razón visible, en vez de dejar que el 422 las descubra:
 *
 * - **El núcleo no se desactiva.** Casilla bloqueada; el catálogo lo marca con
 *   `nucleo`, así que la pantalla no tiene que saberse qué fase es.
 * - **Solo se activa lo que incluye el plan.** Y se distingue de un módulo que
 *   no se contrata en ningún plan (`planes: []`): ahí no hay plan al que subir,
 *   así que ofrecer «actualiza el plan» sería mentir.
 * - **Apagar arrastra a los que dependen.** Se avisa antes de enviar, con el
 *   mismo grafo que usa el backend para decidirlo.
 *
 * Aun así el servidor tiene la última palabra: si responde 422 pidiendo
 * confirmar la cascada, este diálogo cambia a una confirmación que lista los
 * afectados **por su nombre** y reintenta con `confirmar_cascada`. Los datos no
 * se borran: los permisos de un módulo apagado siguen asignados a los roles,
 * quedan inertes, y vuelven solos al reactivarlo.
 */
@Component({
  selector: 'app-modulos-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, IconComponent],
  template: `
    <app-modal titulo="Módulos activos" ancho="lg" (cerrar)="cerrar.emit()">
      @if (afectadosPorCascada(); as afectados) {
        <div
          class="flex flex-col gap-2 rounded border border-error bg-error-container px-3 py-3 text-on-error-container"
        >
          <p class="flex items-center gap-1.5 text-body-sm font-semibold">
            <app-icon name="warning" [size]="14" />
            Desactivación en cascada
          </p>
          <p class="text-body-sm">
            Estos módulos dependen de los que intentas apagar y se apagarían también:
            <strong>{{ nombres(afectados) }}</strong
            >.
          </p>
        </div>

        <p class="text-body-sm text-on-surface-variant">
          Los datos no se borran y los permisos siguen asignados a los roles: quedan inertes hasta
          que el módulo se reactive. Es todo o nada — si algo falla, no se apaga ninguno.
        </p>
      } @else {
        @if (errorGeneral(); as mensaje) {
          <p
            class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
            role="alert"
          >
            {{ mensaje }}
          </p>
        }

        <p class="text-body-sm text-on-surface-variant">
          {{ tenant().razon_social }} · plan {{ tenant().plan.nombre }}. Apagar un módulo no borra
          datos: sus permisos quedan inertes y vuelven solos al reactivarlo.
        </p>

        @for (fase of catalogo.fases(); track fase) {
          <div class="flex flex-col gap-1.5">
            <p class="text-label-caps uppercase text-on-surface-variant">
              {{ etiquetaFase(fase) }}
            </p>

            @for (modulo of catalogo.modulosDeFase(fase); track modulo.codigo) {
              <label
                class="flex items-center gap-2.5 rounded border px-3 py-2 text-body-sm"
                [class]="
                  bloqueado(modulo.codigo)
                    ? 'border-outline-variant/50 bg-surface-container-low text-on-surface-variant'
                    : 'cursor-pointer border-outline-variant text-on-surface hover:bg-surface-container-low'
                "
              >
                <input
                  type="checkbox"
                  [checked]="marcado(modulo.codigo)"
                  [disabled]="bloqueado(modulo.codigo)"
                  (change)="alternar(modulo.codigo)"
                />
                <span class="flex-1">{{ modulo.nombre }}</span>

                @if (modulo.nucleo) {
                  <span class="text-label-md text-on-surface-variant">núcleo</span>
                } @else if (!catalogo.esContratable(modulo.codigo)) {
                  <span class="text-label-md text-on-surface-variant">no contratable</span>
                } @else if (!enPlan(modulo.codigo)) {
                  <span class="text-label-md text-on-surface-variant">no incluido en el plan</span>
                } @else if (seActiva(modulo.codigo)) {
                  <span class="text-label-md font-semibold text-success">se activa</span>
                } @else if (seApaga(modulo.codigo)) {
                  <span class="text-label-md font-semibold text-warning">se apaga</span>
                }
              </label>
            }
          </div>
        }

        @if (faltantes().length > 0) {
          <div
            class="rounded border border-warning bg-warning-container px-3 py-2.5 text-body-sm text-on-warning-container"
          >
            @for (falta of faltantes(); track falta.codigo) {
              <p>
                <strong>{{ catalogo.nombreModulo(falta.codigo) }}</strong> requiere que
                {{ nombres(falta.faltan) }} esté activo primero.
              </p>
            }
          </div>
        }

        @if (cascadaPrevista().length > 0) {
          <p
            class="rounded border border-warning bg-warning-container px-3 py-2.5 text-body-sm text-on-warning-container"
          >
            Apagar lo seleccionado también apagaría
            <strong>{{ nombres(cascadaPrevista()) }}</strong
            >. Se te pedirá confirmarlo antes de aplicar.
          </p>
        }
      }

      <!-- Un único nodo proyectado al pie: dentro de un @if con más de un nodo
           raíz, Angular no lo encajaría en el slot [footer] del modal y los
           botones acabarían en el cuerpo. -->
      <div footer>
        <button
          type="button"
          class="btn btn-secundario"
          [disabled]="enviando()"
          (click)="cerrar.emit()"
        >
          Cancelar
        </button>

        @if (afectadosPorCascada()) {
          <button
            type="button"
            class="btn btn-peligro"
            [disabled]="enviando()"
            (click)="enviar(true)"
          >
            {{ enviando() ? 'Aplicando…' : 'Apagar en cascada' }}
          </button>
        } @else {
          <button
            type="button"
            class="btn btn-primario"
            [disabled]="enviando() || sinCambios()"
            (click)="enviar(false)"
          >
            {{ enviando() ? 'Aplicando…' : 'Aplicar cambios' }}
          </button>
        }
      </div>
    </app-modal>
  `,
})
export class ModulosModal implements OnInit {
  protected readonly catalogo = inject(CatalogoPlataforma);

  readonly tenant = input.required<TenantDetalle>();
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly guardar = output<TenantUpdate>();
  readonly cerrar = output<void>();

  protected readonly etiquetaFase = etiquetaFase;

  private readonly seleccion = signal<readonly string[]>([]);

  /** Los `input()` no están disponibles en el constructor. */
  ngOnInit(): void {
    this.seleccion.set(this.activos());
  }

  private activos(): string[] {
    return this.tenant().modulos_activos.map((modulo) => modulo.codigo);
  }

  protected readonly activar = computed(() =>
    this.seleccion().filter((codigo) => !this.activos().includes(codigo)),
  );

  protected readonly desactivar = computed(() =>
    this.activos().filter((codigo) => !this.seleccion().includes(codigo)),
  );

  protected readonly sinCambios = computed(
    () => this.activar().length === 0 && this.desactivar().length === 0,
  );

  /**
   * Los que el backend pide confirmar. Sale del `extra` del 422, no de una
   * predicción local: es la lista autorizada.
   */
  protected readonly afectadosPorCascada = computed<string[] | null>(() => {
    const error = this.error();
    if (!isApiError(error) || error.extra['requiere_confirmar_cascada'] !== true) return null;

    const afectados = error.extra['modulos_afectados'];
    return Array.isArray(afectados) ? (afectados as string[]) : [];
  });

  /** Aviso anticipado, con el mismo grafo que evalúa el backend. */
  protected readonly cascadaPrevista = computed(() => {
    const desactivar = this.desactivar();
    if (desactivar.length === 0) return [];
    return this.catalogo
      .dependientesActivos(desactivar, this.activos())
      .filter((codigo) => this.seleccion().includes(codigo));
  });

  /** Dependencias que le faltarían a lo que se quiere encender. */
  protected readonly faltantes = computed(() =>
    this.activar()
      .map((codigo) => ({
        codigo,
        faltan: this.catalogo
          .dependenciasDe(codigo)
          .filter((dependencia) => !this.seleccion().includes(dependencia)),
      }))
      .filter((entrada) => entrada.faltan.length > 0),
  );

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || this.afectadosPorCascada() !== null) return null;
    return mensajeDeError(error);
  });

  protected marcado(codigo: string): boolean {
    return this.seleccion().includes(codigo);
  }

  protected enPlan(codigo: string): boolean {
    return this.catalogo.planIncluye(this.tenant().plan.codigo, codigo);
  }

  /**
   * El núcleo nunca; lo que no está en el plan tampoco se puede encender —pero sí
   * apagar, si por alguna razón quedó activo tras un cambio de plan.
   */
  protected bloqueado(codigo: string): boolean {
    const modulo = this.catalogo.modulo(codigo);
    if (modulo?.nucleo) return true;
    return !this.enPlan(codigo) && !this.activos().includes(codigo);
  }

  protected seActiva(codigo: string): boolean {
    return this.activar().includes(codigo);
  }

  protected seApaga(codigo: string): boolean {
    return this.desactivar().includes(codigo);
  }

  protected nombres(codigos: readonly string[]): string {
    return codigos.map((codigo) => this.catalogo.nombreModulo(codigo)).join(', ');
  }

  protected alternar(codigo: string): void {
    this.seleccion.update((actual) =>
      actual.includes(codigo) ? actual.filter((otro) => otro !== codigo) : [...actual, codigo],
    );
  }

  protected enviar(confirmarCascada: boolean): void {
    if (this.enviando()) return;

    this.guardar.emit({
      modulos: { activar: [...this.activar()], desactivar: [...this.desactivar()] },
      ...(confirmarCascada ? { confirmar_cascada: true } : {}),
    });
  }
}
