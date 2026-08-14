/**
 * Puente entre los interceptores de 401 y los servicios que saben cerrar
 * sesión.
 *
 * Existe para romper un ciclo: `session.interceptor` necesita llamar a
 * `AuthService.logout()`, pero `AuthService` usa el cliente axios donde ese
 * interceptor está registrado. En Angular no se notaba porque la inyección de
 * dependencias resolvía el grafo en runtime; con módulos ESM el ciclo sería
 * real y uno de los dos lados llegaría a medio inicializar.
 *
 * Los servicios registran su función de cierre al importarse y los
 * interceptores solo disparan la que esté registrada.
 */
let cerrarTenant = null;
let cerrarPlataforma = null;
export function registrarCierreTenant(fn) {
  cerrarTenant = fn;
}
export function registrarCierrePlataforma(fn) {
  cerrarPlataforma = fn;
}
export function dispararCierreTenant(opciones) {
  void cerrarTenant?.(opciones);
}
export function dispararCierrePlataforma(opciones) {
  void cerrarPlataforma?.(opciones);
}
