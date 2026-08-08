import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RUTA_ACTIVAR_TENANT } from '../../../core/plataforma/rutas';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { formatFechaHora } from '../../../shared/utils/fecha.util';

/**
 * Entrega el enlace de activación del administrador inicial. Sirve al alta y al
 * reenvío.
 *
 * Existe porque el backend devuelve el token **en claro una sola vez**: en la
 * tabla vive su hash y no hay endpoint que lo recupere. Si esta pantalla se
 * cierra sin copiarlo, la única salida es reenviarlo — que rota el token otra
 * vez e invalida el que ya se había mandado por correo.
 *
 * En el reenvío el aviso dice explícitamente que el anterior dejó de servir. Es
 * la consecuencia que se pasa por alto: si el administrador ya tenía el correo
 * original a la mano, ese enlace acaba de morir.
 */
@Component({
  selector: 'app-enlace-activacion-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, IconComponent],
  template: `
    <app-modal [titulo]="titulo()" ancho="lg" (cerrar)="cerrar.emit()">
      <p class="text-body-md text-on-surface">
        <strong>{{ razonSocial() }}</strong>
        <span class="text-on-surface-variant"> · {{ slug() }}</span>
      </p>

      <div
        class="flex flex-col gap-2 rounded border border-warning bg-warning-container px-3 py-3 text-on-warning-container"
      >
        <p class="flex items-center gap-1.5 text-body-sm font-semibold">
          <app-icon name="warning" [size]="14" />
          Este enlace solo se muestra ahora
        </p>
        @if (esReenvio()) {
          <p class="text-body-sm">
            El enlace anterior ya dejó de servir: si el administrador tenía el correo original a la
            mano, ese ya no le funciona.
          </p>
        }
        <p class="text-body-sm">
          Es de un solo uso y vence {{ vencimiento() }}. Ya se encoló por correo a
          <strong>{{ correoDestino() }}</strong
          >; cópialo si necesitas entregarlo por otro medio.
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <p class="text-label-caps uppercase text-on-surface-variant">Enlace de activación</p>
        <div
          class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2"
        >
          <code class="min-w-0 flex-1 break-all font-mono text-mono-sm text-on-surface">
            {{ url() }}
          </code>
          <button type="button" class="btn-fila shrink-0" (click)="copiar(url(), 'enlace')">
            <app-icon [name]="copiado() === 'enlace' ? 'check' : 'edit'" [size]="14" />
            {{ copiado() === 'enlace' ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <p class="text-label-caps uppercase text-on-surface-variant">Token</p>
        <div
          class="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-2"
        >
          <code class="min-w-0 flex-1 break-all font-mono text-mono-sm text-on-surface">
            {{ token() }}
          </code>
          <button type="button" class="btn-fila shrink-0" (click)="copiar(token(), 'token')">
            <app-icon [name]="copiado() === 'token' ? 'check' : 'edit'" [size]="14" />
            {{ copiado() === 'token' ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <p class="text-label-md text-on-surface-variant">
          Por si prefiere pegarlo a mano en la pantalla de activación.
        </p>
      </div>

      <div class="rounded border border-outline-variant px-3 py-2.5 text-body-sm">
        <p class="text-on-surface">
          <span class="text-on-surface-variant">Administrador inicial: </span>
          {{ nombreDestino() || correoDestino() }}
        </p>
        @if (!esReenvio()) {
          <p class="mt-1 text-on-surface-variant">
            Recibe el rol <code class="font-mono">TENANT_ADMIN</code>, con el que administra los
            usuarios, los roles y la política de seguridad de su organización.
          </p>
        }
      </div>

      <div footer>
        <button type="button" class="btn btn-primario" (click)="cerrar.emit()">Entendido</button>
      </div>
    </app-modal>
  `,
})
export class EnlaceActivacionModal {
  private readonly toasts = inject(ToastService);

  readonly razonSocial = input.required<string>();
  readonly slug = input.required<string>();
  readonly correoDestino = input.required<string>();
  readonly nombreDestino = input('');
  readonly token = input.required<string>();
  /** Solo el reenvío lo devuelve; el alta no, y ahí la vigencia es de 24 h. */
  readonly expiraEn = input<string | null>(null);
  readonly esReenvio = input(false);

  readonly cerrar = output<void>();

  protected readonly copiado = signal<'enlace' | 'token' | null>(null);

  protected readonly titulo = computed(() =>
    this.esReenvio() ? 'Enlace de activación reenviado' : 'Organización creada',
  );

  /** Absoluta: el destinatario la recibe por fuera de la app, no como enlace interno. */
  protected readonly url = computed(
    () => `${location.origin}${RUTA_ACTIVAR_TENANT}?token=${encodeURIComponent(this.token())}`,
  );

  protected readonly vencimiento = computed(() => {
    const expira = this.expiraEn();
    return expira ? `el ${formatFechaHora(expira)}` : 'en 24 horas';
  });

  protected async copiar(valor: string, cual: 'enlace' | 'token'): Promise<void> {
    try {
      await navigator.clipboard.writeText(valor);
      this.copiado.set(cual);
    } catch {
      // El portapapeles falla sin HTTPS o sin permiso. El texto sigue visible y
      // seleccionable, así que se avisa en vez de fingir que se copió.
      this.toasts.aviso('No se pudo copiar. Selecciona el texto manualmente.');
    }
  }
}
