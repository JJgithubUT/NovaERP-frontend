import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdateService } from './core/pwa/sw-update.service';

/**
 * Raíz de la app. Solo hospeda el outlet: el layout real lo pone `ShellLayout`,
 * porque las pantallas de login y de error no llevan sidebar.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    // Registro del SW aquí y no en main.ts: así ocurre después del bootstrap y
    // no compite con el primer render por el hilo principal.
    inject(SwUpdateService).registrar();
  }
}
