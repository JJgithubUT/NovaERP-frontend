import { useSyncExternalStore } from 'react';
import { plataformaStore } from './plataforma.store';
/**
 * Suscribe el componente a la sesión del portal de plataforma. Gemelo de
 * `useAuth`, sobre el store separado del SysAdmin.
 */
export function usePlataforma() {
  useSyncExternalStore(
    plataformaStore.subscribe,
    plataformaStore.getState,
    plataformaStore.getState,
  );
  return plataformaStore;
}
