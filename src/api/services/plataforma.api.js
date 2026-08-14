import { api } from '../client';
import { buildParams } from '../http-params';
import { crearRecurso } from '../rest';
/**
 * Cliente HTTP del portal de plataforma (`/api/admin/*`).
 *
 * Es un servicio aparte de `core.api` porque lo son las superficies: estas
 * rutas exigen una sesión de SysAdmin y **rechazan** un token de tenant, igual
 * que las de tenant rechazan uno de plataforma. El interceptor de plataforma en
 * `client.ts` es quien pone el Bearer correcto según el prefijo de la URL.
 *
 * Varias de estas operaciones son de consecuencia inmediata: suspender o dar
 * de baja una organización cierra **todas** las sesiones de sus usuarios al
 * instante, y reenviar la activación invalida el enlace anterior. Las
 * pantallas lo advierten antes de llamar.
 */
const r = crearRecurso('/api');
/* -------------------------------------------------------------------- sesión */
/** Una sola fase: no hay reto OTP que verificar después. */
export function login(body) {
  return r.post('/admin/login/', body);
}
export function logout() {
  return r.post('/admin/logout/');
}
/** Identidad y sesión en curso. 200 = el token guardado sigue vivo. */
export function me() {
  return r.get('/admin/me/');
}
/* ----------------------------------------------------------------- catálogos */
/** Planes, módulos, grafo de dependencias y dominios reservados. */
export function catalogos() {
  return r.get('/admin/catalogos/');
}
/* ------------------------------------------------------------------- tenants */
export function listarTenants(query = {}) {
  return r.get('/admin/tenants/', query);
}
export function detalleTenant(id) {
  return r.get(`/admin/tenants/${id}/`);
}
/** La respuesta trae `activacion_token` en claro **una sola vez**. */
export function crearTenant(body) {
  return r.post('/admin/tenants/', body);
}
/**
 * Datos generales, plan y módulos. Solo hay que mandar lo que cambia: un PATCH
 * sin cambios se rechaza con 422.
 */
export function editarTenant(id, body) {
  return r.patch(`/admin/tenants/${id}/`, body);
}
/**
 * Suspensión (`baja: false`) o baja lógica (`baja: true`) — mismo endpoint, el
 * estado destino va en la query. No borra información y es reversible, pero
 * cierra todas las sesiones del tenant: la respuesta dice cuántas.
 *
 * Va contra axios directo y no por `crearRecurso` porque es la única operación
 * que necesita cuerpo **y** query a la vez.
 */
export async function suspenderTenant(id, body, baja = false) {
  const { data } = await api.post(`/api/admin/tenants/${id}/suspender/`, body, {
    params: buildParams(baja ? { baja: 1 } : {}),
  });
  return data;
}
export function reactivarTenant(id) {
  return r.post(`/admin/tenants/${id}/reactivar/`);
}
/**
 * Reemite el enlace de activación de un entorno que sigue `pendiente`.
 *
 * Es la única vía de rescate: la activación no pasa por el login y el
 * restablecimiento de contraseña exige una cuenta ya activa, así que un enlace
 * vencido dejaría el entorno atrapado para siempre. Rota el token.
 */
export function reenviarActivacion(id) {
  return r.post(`/admin/tenants/${id}/reenviar-activacion/`);
}
/**
 * Canje del enlace por el administrador inicial. **Público y sin token**: no
 * cuelga de `/api/admin/`, lo autoriza el token del enlace y quien lo usa
 * todavía no puede autenticarse.
 */
export function activarTenant(body) {
  return r.post('/auth/activar-tenant/', body);
}
