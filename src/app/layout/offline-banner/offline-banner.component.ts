import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NetworkStatusService } from '../../core/offline/network-status.service';
import { SyncQueueService } from '../../core/offline/sync-queue.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/**
 * El aviso no intrusivo del Flujo 4.
 *
 * Dos estados que la gente confunde y por eso se distinguen aquí:
 * - **Sin conexión**: informativo. No hay nada que el usuario deba hacer.
 * - **Cambios sin enviar**: hay trabajo suyo esperando. Este es el que importa,
 *   y se muestra aunque ya haya vuelto la red, hasta que la cola se vacíe.
 *
 * El tono es deliberadamente tranquilo: el trabajo está a salvo en IndexedDB.
 * Un banner rojo de alarma haría que el usuario dejara de escribir, que es
 * justo lo contrario de lo que queremos.
 */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (aviso(); as info) {
      <div
        role="status"
        aria-live="polite"
        class="flex shrink-0 items-center justify-center gap-2 px-4 py-2 text-center text-body-sm"
        [class]="
          info.tono === 'error'
            ? 'bg-error-container text-on-error-container'
            : 'bg-warning-container text-on-warning-container'
        "
      >
        <app-icon [name]="info.icono" [size]="16" />
        {{ info.texto }}
      </div>
    }
  `,
})
export class OfflineBannerComponent {
  private readonly network = inject(NetworkStatusService);
  private readonly queue = inject(SyncQueueService);

  private readonly pendientes = computed(
    () => this.queue.pendientes().filter((item) => item.estado !== 'fallido').length,
  );

  private readonly fallidos = computed(
    () => this.queue.pendientes().filter((item) => item.estado === 'fallido').length,
  );

  protected readonly aviso = computed<Aviso | null>(() => {
    const fallidos = this.fallidos();
    if (fallidos > 0) {
      return {
        tono: 'error',
        icono: 'error',
        texto: `${fallidos} ${plural(fallidos, 'cambio', 'cambios')} no ${plural(fallidos, 'pudo', 'pudieron')} guardarse. Revísalos.`,
      };
    }

    const pendientes = this.pendientes();
    const online = this.network.online();

    if (pendientes > 0 && !online) {
      return {
        tono: 'aviso',
        icono: 'cloud_done',
        texto: `Sin conexión. ${pendientes} ${plural(pendientes, 'cambio guardado', 'cambios guardados')} en este dispositivo; se ${plural(pendientes, 'enviará', 'enviarán')} al reconectar.`,
      };
    }
    if (pendientes > 0) {
      return {
        tono: 'aviso',
        icono: 'sync',
        texto: `Sincronizando ${pendientes} ${plural(pendientes, 'cambio', 'cambios')}…`,
      };
    }
    if (!online) {
      return {
        tono: 'aviso',
        icono: 'warning',
        texto: 'Sin conexión. Puedes seguir trabajando con los datos ya cargados.',
      };
    }
    return null;
  });
}

interface Aviso {
  /** `error` solo cuando hay trabajo perdido; el resto es informativo. */
  tono: 'aviso' | 'error';
  icono: string;
  texto: string;
}

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}
