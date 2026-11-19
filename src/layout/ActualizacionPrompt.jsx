import { Download } from 'lucide-react';
import { registroPwa, useHayActualizacion } from '../core/pwa/pwa-registro';

/**
 * Aviso de que hay una versión nueva de la aplicación esperando.
 *
 * El Service Worker descarga la actualización pero **no la aplica sola**, y esa
 * es la decisión importante: recargar por su cuenta mientras alguien está
 * capturando una factura le borraría el formulario. Se le ofrece y decide él.
 *
 * El registro del SW no vive aquí sino en `core/pwa/pwa-registro.js`, que se
 * arranca en `main.jsx`: este componente solo existe dentro del shell, y el SW
 * tiene que instalarse también en el login.
 */
export function ActualizacionPrompt() {
  const hayActualizacion = useHayActualizacion();

  if (!hayActualizacion) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant bg-surface-container-high px-4 py-2 text-body-sm text-on-surface">
      <Download size={16} className="shrink-0 text-action" />
      <span>Hay una versión nueva de NovaERP lista para instalarse.</span>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => registroPwa.posponer()}
          className="text-on-surface-variant underline"
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={() => void registroPwa.actualizar()}
          className="font-semibold text-action underline"
        >
          Actualizar y recargar
        </button>
      </div>
    </div>
  );
}