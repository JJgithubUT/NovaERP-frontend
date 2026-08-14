/**
 * Navegación desde fuera del árbol de React.
 *
 * `AuthService.logout()` tiene que llevar al usuario a `/login`, y lo llama
 * tanto un botón como el interceptor de 401 — que es un módulo, no un
 * componente, y no puede usar `useNavigate`. En Angular esto lo resolvía
 * inyectando el `Router`; aquí la raíz de composición registra el navegador del
 * router una vez creado.
 *
 * El respaldo con `location.assign` cubre el instante entre que un módulo se
 * evalúa y el router existe: es una recarga completa en vez de una transición
 * de cliente, pero deja al usuario donde debe estar en lugar de no hacer nada.
 */
let navegador = null;
export function registrarNavegador(fn) {
  navegador = fn;
}
export function navegarA(ruta, opciones) {
  if (navegador) {
    navegador(ruta, opciones);
    return;
  }
  window.location.assign(ruta);
}
