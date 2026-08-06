import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CierreOportunidad, MotivoPerdida, Oportunidad } from '../../../api/models';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { MOTIVOS_PERDIDA } from '../ventas.labels';

/**
 * Cierre de una oportunidad como ganada o perdida.
 *
 * Es **terminal**: no hay endpoint para reabrirla. Por eso el diálogo lo dice
 * en texto, en vez de dejar que el usuario lo descubra cuando ya no pueda
 * deshacerlo.
 *
 * `perdida` exige un motivo del catálogo cerrado del backend. El selector solo
 * aparece en ese caso, y es lo que habilita el botón.
 */
@Component({
  selector: 'app-cerrar-oportunidad-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CampoComponent],
  template: `
    <app-modal [titulo]="'Cerrar ' + oportunidad().nombre" (cerrar)="cerrar.emit()">
      @if (errorGeneral(); as mensaje) {
        <p
          class="rounded border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          role="alert"
        >
          {{ mensaje }}
        </p>
      }

      <p class="text-body-sm text-on-surface-variant">
        El cierre es definitivo: una oportunidad cerrada no se puede reabrir.
      </p>

      <app-campo etiqueta="Resultado" paraId="estado">
        <select
          id="estado"
          class="campo-control"
          [value]="estado()"
          (change)="cambiarEstado($event)"
        >
          <option value="ganada">Ganada</option>
          <option value="perdida">Perdida</option>
        </select>
      </app-campo>

      @if (estado() === 'perdida') {
        <app-campo
          etiqueta="Motivo de la pérdida"
          paraId="motivo"
          [error]="errorDe('motivo_perdida')"
        >
          <select
            id="motivo"
            class="campo-control"
            [value]="motivo()"
            (change)="cambiarMotivo($event)"
          >
            <option value="">Selecciona un motivo…</option>
            @for (opcion of motivos; track opcion) {
              <option [value]="opcion">{{ opcion }}</option>
            }
          </select>
        </app-campo>
      }

      <div footer>
        <button
          type="button"
          class="btn btn-secundario"
          [disabled]="enviando()"
          (click)="cerrar.emit()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primario"
          [disabled]="enviando() || !valido()"
          (click)="enviar()"
        >
          {{ enviando() ? 'Cerrando…' : 'Cerrar oportunidad' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class CerrarOportunidadModal {
  readonly oportunidad = input.required<Oportunidad>();
  readonly enviando = input(false);
  readonly error = input<unknown>(null);

  readonly confirmar = output<CierreOportunidad>();
  readonly cerrar = output<void>();

  protected readonly motivos = MOTIVOS_PERDIDA;

  protected readonly estado = signal<'ganada' | 'perdida'>('ganada');
  protected readonly motivo = signal<MotivoPerdida | ''>('');

  protected readonly errorGeneral = computed(() => {
    const error = this.error();
    if (!error || campoDeError(error)) return null;
    return mensajeDeError(error);
  });

  protected readonly valido = computed(() => this.estado() === 'ganada' || this.motivo() !== '');

  protected errorDe(campo: string): string {
    return campoDeError(this.error()) === campo ? mensajeDeError(this.error()) : '';
  }

  protected cambiarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as 'ganada' | 'perdida');
  }

  protected cambiarMotivo(evento: Event): void {
    this.motivo.set((evento.target as HTMLSelectElement).value as MotivoPerdida | '');
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;

    const estado = this.estado();
    this.confirmar.emit(
      estado === 'perdida'
        ? { estado, motivo_perdida: this.motivo() as MotivoPerdida }
        : { estado },
    );
  }
}
