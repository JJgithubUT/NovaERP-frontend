import { crearRecurso } from '../rest';
/**
 * Endpoints de sesión de la superficie de tenant.
 *
 * Están aparte de `core.api` porque son los únicos que viajan **sin** Bearer:
 * el interceptor los tiene en su lista de rutas públicas. La excepción es
 * `logout` y `me`, que sí van autenticados.
 */
const r = crearRecurso('/api');
/**
 * Fase 1: valida credenciales. Nunca abre sesión por sí sola — el backend exige
 * el segundo factor (RN07), así que la respuesta es siempre un reto de OTP
 * (`mfa: 'otp'` si ya está inscrito, `'enroll'` si es el primer login y hay que
 * dar de alta el TOTP con `secret`/`otpauth_uri`).
 */
export function login(body) {
  return r.post('/auth/login/', body);
}
/** Fase 2: valida el TOTP contra el `reto`. Solo aquí se emite el token. */
export function verificarOtp(reto, codigo) {
  return r.post('/auth/otp/', { reto, codigo });
}
/** Contexto del usuario: perfil, tenant, roles, permisos y módulos. */
export function me() {
  return r.get('/core/me/');
}
/** Revocación del `jti` en curso. El backend la define idempotente. */
export function logout() {
  return r.post('/auth/logout/');
}
