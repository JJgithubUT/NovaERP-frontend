import { AlertTriangle, CheckCircle2, CircleAlert, X } from 'lucide-react';
import { toasts, useToasts } from './toast';

const TONOS = {
  exito: { clases: 'bg-success-container text-on-success-container', Icono: CheckCircle2 },
  error: { clases: 'bg-error-container text-on-error-container', Icono: CircleAlert },
  aviso: { clases: 'bg-warning-container text-on-warning-container', Icono: AlertTriangle },
};

/**
 * Pila de avisos. Va una sola vez, en el shell.
 *
 * `aria-live="polite"` y no `assertive`: el usuario acaba de pulsar Guardar, ya
 * está atento al resultado. Interrumpir lo que el lector esté diciendo sería
 * más molesto que esperar a que termine la frase.
 */
export function ToastHost() {
  const lista = useToasts();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2"
    >
      {lista.map((toast) => {
        const { clases, Icono } = TONOS[toast.tono];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg px-4 py-3 text-body-sm shadow-lg ${clases}`}
          >
            <Icono size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{toast.mensaje}</span>
            <button
              type="button"
              aria-label="Descartar aviso"
              onClick={() => toasts.descartar(toast.id)}
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
