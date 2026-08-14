import { crearRecurso } from '../rest';
/**
 * Cliente HTTP del núcleo: usuarios, roles, sesiones, seguridad y auditoría.
 *
 * Varias de estas operaciones **invalidan sesiones al instante**: suspender un
 * usuario, cerrar sus sesiones o resetear su MFA hacen que su token deje de
 * servir en la siguiente petición. Si el objetivo es uno mismo, la propia
 * sesión de quien pulsa se cae — las pantallas lo advierten antes de llamar.
 */
const r = crearRecurso('/api');
/* ---------------------------------------------------------------- activación */
/**
 * Público, sin sesión: fija la contraseña con el token de alta, o reconfirma
 * un cambio de correo (ahí se omite `password`). El flujo lo decide el estado
 * del registro, no el cliente.
 */
export function activarCuenta(body) {
  return r.post('/auth/activar/', body);
}
/* ------------------------------------------ RF-18: contraseña olvidada */
/**
 * Solicita el enlace de restablecimiento. Público.
 *
 * Responde 200 con el **mismo** mensaje exista el correo o no (RN02): no hay
 * forma de distinguir el caso, y así es como debe quedarse. El token vive
 * **1 hora** —no 24, como el de alta— y no se devuelve aquí: viaja por correo,
 * porque quien pide el restablecimiento puede no ser el titular.
 */
export function solicitarRestablecimiento(body) {
  return r.post('/auth/recuperar/', body);
}
/**
 * Canjea el token por la contraseña nueva. Público, de un solo uso.
 *
 * Al terminar, el backend **invalida todas las sesiones previas** del usuario
 * (RN03): quien tuviera la cuenta abierta en otro dispositivo queda fuera.
 */
export function restablecerPassword(body) {
  return r.post('/auth/restablecer/', body);
}
/* -------------------------------------------------------------------- usuarios */
export function listarUsuarios(query = {}) {
  return r.get('/core/usuarios/', query);
}
/** La respuesta trae `activacion_token` en claro **una sola vez**. */
export function crearUsuario(body) {
  return r.post('/core/usuarios/', body);
}
/**
 * Sirve al admin y al propietario; lo que se acepta depende de quién llama.
 * Cambiar el correo devuelve `verificacion_token` y deja al usuario en
 * `pendiente_verificacion`, sin poder entrar hasta reconfirmarlo.
 */
export function editarUsuario(id, body) {
  return r.patch(`/core/usuarios/${id}/`, body);
}
/** Cierra todas sus sesiones y bloquea su login. No aplica al último admin. */
export function suspenderUsuario(id) {
  return r.post(`/core/usuarios/${id}/suspender/`);
}
export function reactivarUsuario(id) {
  return r.post(`/core/usuarios/${id}/reactivar/`);
}
/** Para pérdida de dispositivo: el usuario re-enrola en su próximo login. */
export function resetearMfa(id) {
  return r.post(`/core/usuarios/${id}/reset-mfa/`);
}
export function cerrarSesionesDe(id) {
  return r.post(`/core/usuarios/${id}/cerrar-sesiones/`);
}
export function asignarRoles(id, roles) {
  return r.post(`/core/usuarios/${id}/roles/`, { roles });
}
/** No deja al usuario sin roles ni revoca al último administrador. */
export function revocarRol(id, rolId) {
  return r.del(`/core/usuarios/${id}/roles/${rolId}/`);
}
/* ----------------------------------------------------------------------- roles */
export function listarRoles(query = {}) {
  return r.get('/core/roles/', query);
}
export function crearRol(body) {
  return r.post('/core/roles/', body);
}
export function editarRol(id, body) {
  return r.patch(`/core/roles/${id}/`, body);
}
/**
 * Baja lógica. Si el rol tiene usuarios asignados el backend la bloquea con
 * 422 y hay que repetirla con `desactivar: true`; el error trae cuántos son.
 * Un rol de sistema nunca se puede desactivar (403).
 */
export async function desactivarRol(id, desactivar = false) {
  await r.del(`/core/roles/${id}/`, desactivar ? { desactivar: true } : {});
}
/** Catálogo maestro para el selector. Los inertes vienen marcados, no ocultos. */
export function catalogoPermisos() {
  return r.get('/core/permisos/');
}
/* -------------------------------------------------------------------- sesiones */
/** Las propias, no las de otros. Marca cuál es la actual. */
export function misSesiones() {
  return r.get('/core/sesiones/');
}
export function cerrarOtrasSesiones() {
  return r.post('/core/sesiones/cerrar-otras/');
}
/** Logout remoto de un dispositivo. Con el `jti` de la sesión actual, sale. */
export function cerrarSesion(jti) {
  return r.del(`/core/sesiones/${jti}/`);
}
/* ---------------------------------------------------- seguridad y auditoría */
export function configSeguridad() {
  return r.get('/core/config-seguridad/');
}
export function editarConfigSeguridad(body) {
  return r.patch('/core/config-seguridad/', body);
}
export function bitacora(query = {}) {
  return r.get('/core/bitacora/', query);
}
/** Exporta el resultado completo, sin paginar. Se audita como EXPORT. */
export function exportarBitacora(query, formato) {
  return r.blob('/core/bitacora/export/', { ...query, formato });
}
export function reporteActividad(query = {}) {
  return r.get('/core/reportes/actividad/', query);
}
export function exportarActividad(query, formato) {
  return r.blob('/core/reportes/actividad/', { ...query, formato });
}
