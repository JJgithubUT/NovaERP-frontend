import { useSyncExternalStore } from 'react';
import { authStore } from './auth.store';
/**
 * Suscribe el componente al store de sesión.
 *
 * Devuelve el propio store en lugar de una copia del estado: sus métodos
 * (`hasPermiso`, `esAdmin`, `modulos`…) leen siempre el estado vigente, y el
 * `useSyncExternalStore` de arriba garantiza que el componente se vuelva a
 * pintar cuando ese estado cambie. Así el código de las pantallas queda igual
 * que el de Angular —`auth.hasPermiso('ventas:pedidos:crear')`— sin tener que
 * desestructurar un objeto distinto en cada una.
 */
export function useAuth() {
  useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState);
  return authStore;
}
/**
 * ¿El usuario tiene este permiso? Recuerda que esto solo sirve para **pintar**
 * la UI: la autorización real se evalúa en cada request y un endpoint puede
 * responder 403 aunque el botón estuviera visible.
 */
export function usePermiso(codigo) {
  return useAuth().hasPermiso(codigo);
}
export function useAlgunPermiso(codigos) {
  return useAuth().hasAnyPermiso(codigos);
}
/** Módulos habilitados del tenant. Fuente del sidebar dinámico. */
export function useModulos() {
  return useAuth().modulos();
}
export function useUsuario() {
  return useAuth().usuario();
}
export function useTenant() {
  return useAuth().tenant();
}
/** Slug del tenant del token. Es el que gobierna el enrutamiento (Flujo 2). */
export function useTenantSlug() {
  return useAuth().tenantSlug();
}
