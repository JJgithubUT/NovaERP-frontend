import axios from 'axios';
import { API_BASE_URL } from '../core/config/api.config';
import { authStore } from '../core/auth/auth.store';
import { plataformaStore } from '../core/plataforma/plataforma.store';
import { isApiError } from '../core/errors/api-error.model';
import { normalizeError } from '../core/errors/normalize-error';
import { dispararCierrePlataforma, dispararCierreTenant } from '../core/auth/cierre-sesion';
/**
 * Cliente HTTP único de la app. Concentra lo que en Angular eran cuatro
 * interceptores registrados en `app.config.ts`.
 *
 * El orden importa y no es el mismo en las dos direcciones:
 *
 * - **Petición saliente:** primero el Bearer del tenant, luego el del portal.
 *   Son excluyentes por construcción (cada uno mira el prefijo de la URL), así
 *   que el orden entre ellos da igual; lo que no da igual es que ninguno toque
 *   peticiones a otros orígenes.
 * - **Respuesta de vuelta:** primero la normalización del error y después los
 *   vigilantes de 401. Axios ejecuta los interceptores de respuesta en orden de
 *   registro, así que registrar el normalizador primero es lo que garantiza que
 *   los demás reciban ya un `ApiError` y no un `AxiosError` crudo.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
/* ------------------------------------------------------------- superficies */
/**
 * Endpoints que no llevan (ni deben llevar) token: cuando se llaman todavía no
 * existe sesión. `activar/` entra aquí por lo mismo — la autoriza el token de
 * un solo uso, no un JWT—, y además evita mandar la credencial de quien tuviera
 * una sesión abierta en este navegador a una operación que no es suya.
 */
const RUTAS_PUBLICAS_TENANT = [
  '/api/auth/login/',
  '/api/auth/otp/',
  '/api/auth/activar/',
  // Canje del enlace de alta de una organización: lo autoriza el token de un
  // solo uso, y quien lo usa todavía no puede autenticarse.
  '/api/auth/activar-tenant/',
  // RF-18. Quien recupera su contraseña puede estar en un navegador con la
  // sesión de otra persona abierta: mandar ese Bearer sería filtrarlo a una
  // operación que no es suya, y el backend no lo necesita para nada.
  '/api/auth/recuperar/',
  '/api/auth/restablecer/',
];
/**
 * Prefijo de la superficie de plataforma. El token de tenant **no** vale ahí
 * —el backend responde 401— y mandarlo sería filtrar la credencial de un tenant
 * a un endpoint que no es suyo.
 */
const PREFIJO_PLATAFORMA = '/api/admin/';
/** El propio login del portal todavía no tiene token que mandar. */
const RUTAS_PUBLICAS_PLATAFORMA = ['/api/admin/login/'];
/**
 * Un 401 en el login o en el OTP no es una sesión expirada sino
 * credenciales/código malos: ahí no hay que hacer logout, el formulario ya
 * muestra el mensaje.
 *
 * `/api/auth/logout/` está en la lista por una razón distinta y más delicada:
 * es la petición que hace el propio `logout()`. Si respondiera 401 (token ya
 * caducado, sesión revocada desde otro dispositivo) y la tratáramos como sesión
 * expirada, llamaríamos a `logout()` desde dentro de `logout()` — recursión
 * infinita. Además sería redundante: quien la disparó ya está cerrando sesión.
 */
const RUTAS_SIN_SESION_TENANT = ['/api/auth/login/', '/api/auth/otp/', '/api/auth/logout/'];
const RUTAS_SIN_SESION_PLATAFORMA = ['/api/admin/login/', '/api/admin/logout/'];
function urlDe(config) {
  return config.url ?? '';
}
function incluyeAlguna(url, rutas) {
  return rutas.some((ruta) => url.includes(ruta));
}
function esDePlataforma(url) {
  return url.includes(PREFIJO_PLATAFORMA);
}
/**
 * Relativa (mismo origen) o absoluta contra nuestro backend. `URL` con base
 * resuelve ambos casos sin parsear a mano. Si la app pide un asset a un CDN,
 * mandarle el token del tenant sería una fuga de credenciales.
 */
function esApiPropia(url) {
  try {
    const target = new URL(url, API_BASE_URL || window.location.origin);
    return target.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}
/* -------------------------------------------------- petición: los dos Bearer */
/**
 * Inyecta `Authorization: Bearer <JWT>` del tenant en toda petición saliente al
 * backend, y solo fuera de la superficie de plataforma.
 */
api.interceptors.request.use((config) => {
  const url = urlDe(config);
  const token = authStore.token();
  if (
    !token ||
    incluyeAlguna(url, RUTAS_PUBLICAS_TENANT) ||
    esDePlataforma(url) ||
    !esApiPropia(url)
  ) {
    return config;
  }
  config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});
/**
 * Inyecta el Bearer del SysAdmin, y **solo** en la superficie de plataforma.
 *
 * La pareja con el interceptor de arriba es lo que mantiene aisladas las dos
 * superficies en el cliente, igual que el middleware las aísla en el servidor:
 * cada token viaja únicamente a las rutas que lo aceptan. Sin este reparto, un
 * navegador con las dos sesiones abiertas mandaría el token equivocado en
 * cuanto una pantalla llamara al prefijo de la otra.
 */
api.interceptors.request.use((config) => {
  const url = urlDe(config);
  const token = plataformaStore.token();
  if (!token || !esDePlataforma(url) || incluyeAlguna(url, RUTAS_PUBLICAS_PLATAFORMA)) {
    return config;
  }
  config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});
/* ------------------------------------ respuesta: normalizar y vigilar el 401 */
/** Traduce todo error HTTP al `ApiError` único de la app (Flujo 5). */
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeError(error)),
);
/**
 * Vigila los 401 del tenant y dispara el logout global.
 *
 * El backend no tiene refresh token: un 401 es terminal, no hay nada que
 * reintentar. Solo queda limpiar la sesión y mandar al usuario a /login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const esSesionExpirada =
      isApiError(error) &&
      error.kind === 'auth' &&
      !esDePlataforma(url) &&
      !incluyeAlguna(url, RUTAS_SIN_SESION_TENANT);
    if (esSesionExpirada) {
      // Sin await: no queremos retrasar la propagación del error al caller.
      // Sin revocar: el 401 significa que el backend ya dio la sesión por
      // cerrada, así que no hay nada que revocar.
      dispararCierreTenant({ revocar: false });
    }
    return Promise.reject(error);
  },
);
/**
 * Gemelo del anterior para el portal de plataforma: vigila los 401 de
 * `/api/admin/*` y cierra **esa** sesión, sin tocar la del tenant.
 *
 * Un 401 aquí no dice nada sobre la sesión de tenant: tratarlo como tal echaría
 * del ERP a un usuario por el simple hecho de tener abierta la pestaña del
 * portal con un token vencido.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const esSesionExpirada =
      isApiError(error) &&
      error.kind === 'auth' &&
      esDePlataforma(url) &&
      !incluyeAlguna(url, RUTAS_SIN_SESION_PLATAFORMA);
    if (esSesionExpirada) {
      dispararCierrePlataforma({ revocar: false });
    }
    return Promise.reject(error);
  },
);
