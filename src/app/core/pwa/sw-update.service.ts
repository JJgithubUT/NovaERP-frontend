import { Injectable, signal } from '@angular/core';
import { Workbox } from 'workbox-window';
import { environment } from '../../../environments/environment';

/**
 * Registra el Service Worker y gestiona sus actualizaciones (Flujo 1).
 *
 * El shell se sirve desde caché al instante y la comprobación de versión ocurre
 * en segundo plano. Cuando hay código nuevo, **no** se recarga sola: un ERP
 * recargándose bajo los dedos del usuario le puede costar un formulario a medio
 * llenar. Se le avisa y él decide cuándo.
 */
@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly _updateReady = signal(false);
  /** Hay una versión nueva esperando en el SW en espera. */
  readonly updateReady = this._updateReady.asReadonly();

  private wb: Workbox | null = null;

  registrar(): void {
    if (!environment.enableServiceWorker || !('serviceWorker' in navigator)) return;

    const wb = new Workbox('/sw.js');
    this.wb = wb;

    // 'waiting' = hay un SW nuevo instalado que no puede tomar control porque
    // este sigue vivo. Es exactamente el momento de ofrecer la actualización.
    wb.addEventListener('waiting', () => this._updateReady.set(true));

    // Solo recargamos cuando el SW nuevo toma control por orden nuestra.
    wb.addEventListener('controlling', () => window.location.reload());

    void wb.register();
  }

  /** Aplica la actualización. Dispara 'controlling' y, con él, el reload. */
  aplicarUpdate(): void {
    this.wb?.messageSkipWaiting();
  }
}
