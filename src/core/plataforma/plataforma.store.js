import { decodeClaims } from '../auth/jwt.util';
/**
 * Clave propia, distinta de `novaerp.token`. No es cosmético: un SysAdmin y un
 * usuario de tenant pueden estar autenticados a la vez en el mismo navegador, y
 * compartir la llave haría que entrar en una superficie echase al de la otra.
 */
const TOKEN_KEY = 'novaerp.plataforma.token';
/** Margen para no mandar un token que expira en pleno vuelo de la petición. */
const SKEW_SEGUNDOS = 30;
/**
 * Custodio de la sesión del portal de plataforma. Es el equivalente de
 * `AuthStore` para el SysAdmin, y está separado por lo mismo que lo están las
 * dos superficies en el backend.
 *
 * Diferencias que importan frente a `AuthStore`:
 *
 * - **No hay tenant.** El token del SysAdmin no lleva `tid`, así que no hay
 *   slug que gobierne el enrutamiento ni claves de caché que prefijar.
 * - **No hay permisos ni roles.** El SysAdmin es superusuario plano sobre
 *   `/api/admin/`: no pasa por el resolutor de permisos, y por eso aquí no hay
 *   nada parecido a `hasPermiso`.
 * - **La identidad no se cachea en el storage.** Solo el token. Guardar el
 *   correo significaría poder pintar una identidad que ya no corresponde a la
 *   sesión viva; `GET /api/admin/me/` la resuelve en cada arranque. Es
 *   asequible porque el portal no es offline-first: el SysAdmin opera contra
 *   datos cross-tenant que no tiene sentido servir desde caché.
 */
class PlataformaStore {
  state = { token: localStorage.getItem(TOKEN_KEY), me: null };
  listeners = new Set();
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getState = () => this.state;
  token() {
    return this.state.token;
  }
  me() {
    return this.state.me;
  }
  /**
   * Hay token y su `exp` no ha pasado. Comprobación optimista para el guard: la
   * sesión puede estar revocada en el servidor aunque el token siga vigente
   * (revocar un `jti` o desactivar la cuenta), y de eso solo se entera `me()`.
   */
  autenticado() {
    const claims = leerClaims(this.state.token);
    return claims !== null && claims.exp * 1000 > Date.now() + SKEW_SEGUNDOS * 1000;
  }
  /** El contexto de `/api/admin/me/` ya llegó y el portal puede operar. */
  listo() {
    return this.autenticado() && this.state.me !== null;
  }
  correo() {
    return this.state.me?.correo ?? null;
  }
  /** Vencimiento según el servidor. La barra lo muestra sin decodificar el JWT. */
  expiraEn() {
    return this.state.me?.sesion?.expira_en ?? null;
  }
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
    this.commit({ ...this.state, token });
  }
  setMe(me) {
    this.commit({ ...this.state, me });
  }
  /** Idempotente: varias peticiones en vuelo pueden fallar con 401 a la vez. */
  limpiar() {
    localStorage.removeItem(TOKEN_KEY);
    if (this.state.token === null && this.state.me === null) return;
    this.commit({ token: null, me: null });
  }
  commit(state) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
export const plataformaStore = new PlataformaStore();
function leerClaims(token) {
  if (!token) return null;
  const claims = decodeClaims(token);
  if (!claims) return null;
  const { sub, jti, exp, typ } = claims;
  // `typ` es la marca inequívoca del portal. Sin comprobarla, un token de
  // tenant pegado a mano en esta llave pasaría el guard y solo lo cazaría el
  // primer 401 del backend.
  if (typ !== 'sysadmin') return null;
  if (typeof sub !== 'string' || typeof jti !== 'string' || typeof exp !== 'number') return null;
  return { sub, jti, exp };
}
