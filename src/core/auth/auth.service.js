import * as authApi from '../../api/services/auth.api';
import { queryClient } from '../query/query-client';
import { navegarA } from '../router/navegacion';
import { authStore } from './auth.store';
import { registrarCierreTenant } from './cierre-sesion';
/**
 * Orquestador de la sesión de tenant. Coordina el store, la caché de queries y
 * la navegación; el HTTP crudo vive en `api/services/auth.api`.
 */
/**
 * Fase 1 del login: valida credenciales. Nunca abre sesión por sí sola — el
 * backend exige el segundo factor (RN07), así que la respuesta es siempre un
 * reto de OTP.
 */
export function login(credenciales) {
  return authApi.login(credenciales);
}
/**
 * Fase 2: valida el código TOTP contra el `reto` de la fase 1. Solo aquí se
 * emite el token de sesión. Devuelve el `me` ya resuelto para que el caller
 * sepa a qué ruta mandar al usuario.
 */
export async function verificarOtp(reto, codigo) {
  const { token } = await authApi.verificarOtp(reto, codigo);
  authStore.setSession(token);
  return await cargarMe();
}
/** Contexto del usuario: perfil, tenant, roles, permisos y módulos. */
export async function cargarMe() {
  const me = await authApi.me();
  authStore.setMe(me);
  return me;
}
/**
 * Cierre de sesión global. Lo llama tanto el usuario como el interceptor de
 * 401. Limpia la caché de queries además del store: si no, el siguiente usuario
 * que entre en este dispositivo vería por un instante los datos del anterior
 * renderizados desde caché.
 *
 * `revocar` decide si además se cierra la sesión **en el servidor** (RF-17). Va
 * en `true` cuando sale el usuario y en `false` cuando el disparador es un 401:
 * ahí la sesión ya está muerta en el backend y la petición solo serviría para
 * recibir otro 401.
 *
 * La limpieza local ocurre pase lo que pase. Si la revocación falla —sin red,
 * el token ya caducó, el servidor no responde— el usuario igual sale de la
 * aplicación: dejarlo dentro por no poder avisar al backend sería el peor de
 * los dos resultados.
 */
export async function logout({ redirigirA = '/login', revocar = true } = {}) {
  // Antes de `authStore.clear()`: el Bearer que necesita esta petición sale del
  // store, y una vez limpiado ya no habría token que revocar.
  if (revocar && authStore.token()) {
    try {
      await authApi.logout();
    } catch {
      // Silencio deliberado: el cierre local no es negociable y no hay nada
      // que el usuario pueda hacer con este error.
    }
  }
  authStore.clear();
  queryClient.clear();
  navegarA(redirigirA, { replace: true });
}
/**
 * Deja el logout al alcance del interceptor de 401 sin que `client.ts` tenga
 * que importar este módulo (que importa el cliente).
 */
registrarCierreTenant(({ revocar }) => logout({ revocar }));
/**
 * Refresca el contexto del usuario al arrancar, si hay token.
 *
 * No bloquea el arranque: el shell se pinta al instante con el `me` cacheado en
 * localStorage y los roles/módulos se actualizan cuando la respuesta llegue. Es
 * lo que hace que el usuario vea la app, no un spinner, aunque el backend tarde
 * o no esté.
 *
 * Si el token ya caducó, ni se intenta: se limpia y el guard manda a /login.
 */
export function arrancarSesion() {
  if (!authStore.token()) return;
  if (!authStore.isAuthenticated()) {
    authStore.clear();
    return;
  }
  // Un fallo aquí no debe tumbar el arranque: sin red seguimos con la caché,
  // y si el token murió, el interceptor de 401 hace el logout.
  void cargarMe().catch(() => undefined);
}
