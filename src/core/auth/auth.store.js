import { decodeJwt, isExpired } from './jwt.util';
const TOKEN_KEY = 'novaerp.token';
const ME_KEY = 'novaerp.me';
/**
 * Custodio del estado de sesión. En Angular esto era un servicio raíz con
 * signals; aquí es un singleton observable, por una razón concreta: los
 * interceptores de axios son módulos, no componentes, y no pueden leer un
 * contexto de React. Con esto ambos mundos leen la misma fuente — los
 * interceptores llaman a los getters directo y los componentes se suscriben
 * con `useSyncExternalStore` (ver `useAuth`).
 *
 * Es la única fuente de verdad para el token, el tenant activo, los permisos y
 * los módulos que arman el sidebar.
 *
 * Sobre la persistencia: el token vive en localStorage para que la PWA
 * sobreviva a un reload y al arranque en frío sin red. La contrapartida es que
 * un XSS puede leerlo — es el mismo trade-off que asume cualquier SPA con
 * Bearer tokens, y lo mitigamos con la expiración de 8h del backend. Si en el
 * futuro el backend emite una cookie httpOnly + refresh token, este es el único
 * archivo que hay que cambiar.
 */
class AuthStore {
  /*
   * El estado es un objeto inmutable que se reemplaza entero en cada cambio.
   * `useSyncExternalStore` exige que `getState` devuelva una referencia estable
   * mientras nada cambie: si construyéramos el objeto en cada llamada, React
   * entraría en un bucle de renders.
   */
  state = { token: leerToken(), me: leerMe() };
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
  /** Payload del JWT ya decodificado. `null` si no hay token o está corrupto. */
  session() {
    const token = this.state.token;
    return token ? decodeJwt(token) : null;
  }
  /** Tenant del token. Es el que gobierna el enrutamiento (Flujo 2). */
  tenantSlug() {
    return this.session()?.tid ?? null;
  }
  usuarioId() {
    return this.session()?.sub ?? null;
  }
  /**
   * Hay token y todavía no expiró. Ojo: es una comprobación optimista de UI, no
   * una garantía — el backend sigue siendo quien decide.
   */
  isAuthenticated() {
    const session = this.session();
    return session !== null && !isExpired(session);
  }
  /** El contexto de /api/core/me/ ya llegó: roles, permisos y módulos listos. */
  isReady() {
    return this.isAuthenticated() && this.state.me !== null;
  }
  usuario() {
    return this.state.me?.usuario ?? null;
  }
  tenant() {
    return this.state.me?.tenant ?? null;
  }
  roles() {
    return this.state.me?.roles ?? [];
  }
  /**
   * Rol de sistema con bypass. Hay que consultarlo **además** de `hasPermiso`:
   * un `TENANT_ADMIN` autoriza cualquier cosa sin que su `permisos` liste nada,
   * así que comprobar solo el permiso lo dejaría fuera de sus propias
   * pantallas de administración.
   */
  esAdmin() {
    return this.state.me?.es_admin === true;
  }
  /** Módulos habilitados del tenant. Fuente del sidebar dinámico. */
  modulos() {
    return this.state.me?.modulos ?? [];
  }
  setSession(token) {
    localStorage.setItem(TOKEN_KEY, token);
    this.commit({ ...this.state, token });
  }
  setMe(me) {
    localStorage.setItem(ME_KEY, JSON.stringify(me));
    this.commit({ ...this.state, me });
  }
  /**
   * Limpia la sesión. Idempotente a propósito: el interceptor de 401 puede
   * dispararlo varias veces si varias requests en vuelo fallan a la vez.
   *
   * No toca el outbox ni los catálogos de IndexedDB: el trabajo pendiente del
   * usuario sobrevive al logout y se sincroniza cuando vuelva a entrar.
   */
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ME_KEY);
    if (this.state.token === null && this.state.me === null) return;
    this.commit({ token: null, me: null });
  }
  /**
   * ¿El usuario tiene este permiso? Los guards de ruta se apoyan en esto.
   *
   * Un administrador de tenant pasa siempre: su rol de sistema tiene bypass en
   * el backend, y `permisos` puede llegar vacío aunque lo pueda todo.
   */
  hasPermiso(codigo) {
    if (this.esAdmin()) return true;
    return (this.state.me?.permisos ?? []).some((permiso) => permiso.codigo === codigo);
  }
  hasAnyPermiso(codigos) {
    return codigos.some((codigo) => this.hasPermiso(codigo));
  }
  hasModulo(codigo) {
    return this.modulos().some((modulo) => modulo.codigo === codigo);
  }
  hasRol(nombre) {
    return this.roles().includes(nombre);
  }
  commit(state) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
export const authStore = new AuthStore();
function leerToken() {
  return localStorage.getItem(TOKEN_KEY);
}
/**
 * El `me` cacheado permite pintar el shell (sidebar, nombre de usuario) en el
 * arranque en frío sin red, antes de que /api/core/me/ responda o falle.
 */
function leerMe() {
  const raw = localStorage.getItem(ME_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(ME_KEY);
    return null;
  }
}
