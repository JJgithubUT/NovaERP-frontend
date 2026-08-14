import { AlertTriangle, CloudOff, RefreshCw, X } from 'lucide-react';
import { useEstadoRed } from '../core/offline/network-status';
import { colaSync, usePendientes } from '../core/offline/sync-queue';
import { toasts } from '../shared/ui/toast';

/**
 * Banda de estado offline y de la cola de escrituras.
 *
 * Distingue tres situaciones que el usuario vive distinto:
 *
 * - **Sin red, nada encolado** — aviso informativo: puede seguir consultando lo
 *   que ya está en caché.
 * - **Cambios esperando** — se dice cuántos y que se enviarán solos. Es la
 *   promesa que justifica haberle dejado guardar sin conexión.
 * - **Cambios fallidos** — el backend los rechazó con un error definitivo (un
 *   422 de regla de negocio, o un 401 porque el token de 8 h caducó estando
 *   offline). Estos **no se reintentan solos**: hacen falta el usuario y una
 *   decisión, así que se ofrecen reintentar o descartar uno por uno.
 *
 * No se muestra nada cuando hay red y la cola está vacía, que es el caso normal.
 */
export function OfflineBanner() {
  const online = useEstadoRed();
  const pendientes = usePendientes();

  const enCola = pendientes.filter((i) => i.estado !== 'fallido').length;
  const fallidos = pendientes.filter((i) => i.estado === 'fallido');

  if (online && enCola === 0 && fallidos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-outline-variant">
      {!online ? (
        <div className="flex items-center gap-2 bg-warning-container px-4 py-2 text-body-sm text-on-warning-container">
          <CloudOff size={16} className="shrink-0" />
          <span>
            Sin conexión. Puedes seguir consultando lo ya cargado; los cambios se guardarán aquí
            hasta que vuelva la red.
          </span>
        </div>
      ) : null}

      {enCola > 0 ? (
        <div className="flex flex-wrap items-center gap-2 bg-info-container px-4 py-2 text-body-sm text-on-info-container">
          <RefreshCw size={16} className="shrink-0" />
          <span>
            {enCola} {enCola === 1 ? 'cambio pendiente' : 'cambios pendientes'} de enviar.
          </span>
          {online ? (
            <button
              type="button"
              onClick={() => void colaSync.drenar()}
              className="ml-auto font-semibold underline"
            >
              Enviar ahora
            </button>
          ) : null}
        </div>
      ) : null}

      {fallidos.length > 0 ? (
        <div className="flex flex-col gap-1.5 bg-error-container px-4 py-2 text-body-sm text-on-error-container">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="font-semibold">
              {fallidos.length} {fallidos.length === 1 ? 'cambio rechazado' : 'cambios rechazados'}{' '}
              por el servidor
            </span>
          </div>

          <ul className="flex flex-col gap-1">
            {fallidos.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 pl-6">
                <span className="min-w-0 flex-1">
                  <span className="font-mono">{item.entidad}</span> · {item.operacion} ·{' '}
                  {item.ultimoError ?? 'sin detalle'}
                </span>
                <button
                  type="button"
                  onClick={() => void colaSync.reintentar(item.id)}
                  className="font-semibold underline"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await colaSync.descartar(item.id);
                    toasts.aviso('Cambio descartado.');
                  }}
                  aria-label="Descartar cambio"
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
