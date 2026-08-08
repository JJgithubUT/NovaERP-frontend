import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

/**
 * Muestra el token de activación o de verificación recién emitido.
 *
 * Existe porque el backend lo devuelve **en claro una sola vez** y no hay
 * endpoint para recuperarlo: si esta pantalla no lo enseña de forma
 * inequívoca, el usuario nuevo se queda sin poder activar su cuenta y hay que
 * darlo de alta otra vez.
 *
 * En producción el token también llega por correo al destinatario; en
 * desarrollo esta es la única vía. El texto lo dice para que nadie asuma que
 * "ya se le habrá enviado".
 */
@Component({
  selector: 'app-token-activacion-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, IconComponent],
  template: `
    <app-modal [titulo]="titulo()" (cerrar)="cerrar.emit()">
      <p class="text-body-md text-on-surface">{{ mensaje() }}</p>

      <div
        class="flex flex-col gap-2 rounded border border-warning bg-warning-container px-3 py-3 text-on-warning-container"
      >
        <p class="text-body-sm font-semibold">Este código solo se muestra ahora.</p>
        <p class="text-body-sm">
          No se puede volver a consultar. Cópialo y hazlo llegar a
          <strong>{{ destinatario() }}</strong> si no le llega por correo.
        </p>
        <p class="text-body-sm">
          Se canjea en <code class="font-mono">{{ urlActivar }}</code
          >, sin necesidad de iniciar sesión.
        </p>
      </div>

      <div
        class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2"
      >
        <code class="min-w-0 flex-1 break-all font-mono text-mono-sm text-on-surface">
          {{ token() }}
        </code>
        <button type="button" class="btn-fila shrink-0" (click)="copiar()">
          <app-icon [name]="copiado() ? 'check' : 'edit'" [size]="14" />
          {{ copiado() ? 'Copiado' : 'Copiar' }}
        </button>
      </div>

      <div footer>
        <button type="button" class="btn btn-primario" (click)="cerrar.emit()">Entendido</button>
      </div>
    </app-modal>
  `,
})
export class TokenActivacionModal {
  private readonly toasts = inject(ToastService);

  readonly titulo = input('Cuenta creada');
  readonly mensaje = input(
    'El usuario debe fijar su contraseña con este código para poder entrar.',
  );
  readonly destinatario = input.required<string>();
  readonly token = input.required<string>();

  readonly cerrar = output<void>();

  /** Absoluta: el destinatario recibe esto por fuera de la app, no un enlace interno. */
  protected readonly urlActivar = `${location.origin}/activar`;

  protected readonly copiado = signal(false);

  protected async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.token());
      this.copiado.set(true);
    } catch {
      // El portapapeles falla sin HTTPS o sin permiso. El código sigue visible
      // y seleccionable, así que se avisa en vez de fingir que se copió.
      this.toasts.aviso('No se pudo copiar. Selecciona el código manualmente.');
    }
  }
}
