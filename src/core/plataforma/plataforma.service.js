import * as plataformaApi from '../../api/services/plataforma.api';
import { registrarCierrePlataforma } from '../auth/cierre-sesion';
import { queryClient } from '../query/query-client';
import { navegarA } from '../router/navegacion';
import { plataformaStore } from './plataforma.store';
import { RUTA_ACCESO_PLATAFORMA } from './rutas';
/**
 * Orquestador de la sesión del portal de plataforma. Equivale a
 * `auth.service` en la superficie de tenant, con una diferencia de fondo: el
 * login es de **una sola fase**. El backend no exige segundo factor al SysAdmin
 * (decisión documentada, `core.sysadmin.mfa_secret` queda reservada), así que no
 * hay reto OTP que verificar después.
 */
/** Devuelve el contexto ya resuelto: quien llama no necesita un segundo paso. */
export async function login(credenciales) {
  const { token } = await plataformaApi.login(credenciales);
  plataformaStore.setToken(token);
  return await cargarMe();
}
export async function cargarMe() {
  const me = await plataformaApi.me();
  plataformaStore.setMe(me);
  return me;
}
/**
 * Cierre de sesión del portal. Lo llaman tanto el SysAdmin como el interceptor
 * de 401.
 *
 * `revocar` va en `false` cuando el disparador es un 401: ahí el backend ya dio
 * la sesión por muerta y la petición solo traería otro 401. La limpieza local
 * ocurre pase lo que pase — dejar a alguien dentro del portal por no poder
 * avisar al servidor sería el peor de los dos resultados.
 */
export async function salir({ revocar = true } = {}) {
  // Antes de limpiar: el Bearer que necesita esta petición sale del store.
  if (revocar && plataformaStore.token()) {
    try {
      await plataformaApi.logout();
    } catch {
      // Silencio deliberado: el backend la define idempotente y no hay nada
      // que el SysAdmin pueda hacer con este error.
    }
  }
  plataformaStore.limpiar();
  // Las consultas del portal son cross-tenant: dejarlas en caché mostraría
  // organizaciones ajenas al siguiente que entre en este dispositivo.
  queryClient.clear();
  navegarA(RUTA_ACCESO_PLATAFORMA, { replace: true });
}
registrarCierrePlataforma(({ revocar }) => salir({ revocar }));
/**
 * Resuelve la identidad al arrancar, si hay token. A diferencia del tenant, el
 * portal no cachea el `me`: se pide siempre, y un fallo deja el store sin
 * identidad para que el guard mande al acceso.
 */
export function arrancarSesionPlataforma() {
  if (!plataformaStore.autenticado()) return;
  void cargarMe().catch(() => undefined);
}
