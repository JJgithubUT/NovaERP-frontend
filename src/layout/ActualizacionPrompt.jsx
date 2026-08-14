import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download } from 'lucide-react';

/**
 * Aviso de que hay una versión nueva de la aplicación esperando.
 *
 * El Service Worker descarga la actualización pero **no la aplica sola**, y esa
 * es la decisión importante: recargar por su cuenta mientras alguien está
 * capturando una factura le borraría el formulario. Se le ofrece y decide él.
 *
 * `onNeedRefresh` se dispara cuando hay un SW nuevo en espera; `updateServiceWorker(true)`
 * lo activa y recarga.
 */
export function ActualizacionPrompt() {
  const {
    needRefresh: [hayActualizacion, setHayActualizacion],
    updateServiceWorker,
  } = useRegisterSW();

  if (!hayActualizacion) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant bg-surface-container-high px-4 py-2 text-body-sm text-on-surface">
      <Download size={16} className="shrink-0 text-action" />
      <span>Hay una versión nueva de NovaERP lista para instalarse.</span>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => setHayActualizacion(false)}
          className="text-on-surface-variant underline"
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="font-semibold text-action underline"
        >
          Actualizar y recargar
        </button>
      </div>
    </div>
  );
}
