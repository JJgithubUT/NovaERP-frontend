import { Injectable, computed, signal } from '@angular/core';
import type { MeResponse, Modulo } from '../../api/models';
import { decodeJwt, isExpired } from './jwt.util';

const TOKEN_KEY = 'novaerp.token';
const ME_KEY = 'novaerp.me';

/**
 * Custodio del estado de sesión (el rol que el documento de arquitectura le da
 * a Zustand). En Angular esto es un servicio raíz con signals: mismo resultado,
 * sin dependencia extra.
 *
 * Es la única fuente de verdad para el token, el tenant activo, los permisos y
 * los módulos que arman el sidebar.
 *
 * Sobre la persistencia: el token vive en localStorage para que la PWA
 * sobreviva a un reload y al arranque en frío sin red. La contrapartida es que
 * un XSS puede leerlo — es el mismo trade-off que asume cualquier SPA con
 * Bearer tokens, y lo mitigamos con la CSP y la expiración de 8h del backend.
 * Si en el futuro el backend emite una cookie httpOnly + refresh token, esta es
 * la única clase que hay que cambiar.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _token = signal<string | null>(leerToken());
  private readonly _me = signal<MeResponse | null>(leerMe());

  readonly token = this._token.asReadonly();
  readonly me = this._me.asReadonly();

  /** Payload del JWT ya decodificado. `null` si no hay token o está corrupto. */
  readonly session = computed(() => {
    const token = this._token();
    return token ? decodeJwt(token) : null;
  });

  /** Tenant del token. Es el que gobierna el enrutamiento (Flujo 2). */
  readonly tenantSlug = computed(() => this.session()?.tid ?? null);

  readonly usuarioId = computed(() => this.session()?.sub ?? null);

  /**
   * Hay token y todavía no expiró. Ojo: es una comprobación optimista de UI, no
   * una garantía — el backend sigue siendo quien decide.
   */
  readonly isAuthenticated = computed(() => {
    const session = this.session();
    return session !== null && !isExpired(session);
  });

  /** El contexto de /api/core/me/ ya llegó: roles, permisos y módulos listos. */
  readonly isReady = computed(() => this.isAuthenticated() && this._me() !== null);

  readonly usuario = computed(() => this._me()?.usuario ?? null);
  readonly tenant = computed(() => this._me()?.tenant ?? null);
  readonly roles = computed(() => this._me()?.roles ?? []);

  /**
   * Rol de sistema con bypass. Hay que consultarlo **además** de `hasPermiso`:
   * un `TENANT_ADMIN` autoriza cualquier cosa sin que su `permisos` liste nada,
   * así que comprobar solo el permiso lo dejaría fuera de sus propias
   * pantallas de administración.
   */
  readonly esAdmin = computed(() => this._me()?.es_admin === true);

  /** Módulos habilitados del tenant. Fuente del sidebar dinámico. */
  readonly modulos = computed<readonly Modulo[]>(() => this._me()?.modulos ?? []);

  private readonly permisoCodigos = computed(
    () => new Set((this._me()?.permisos ?? []).map((permiso) => permiso.codigo)),
  );

  private readonly moduloCodigos = computed(
    () => new Set(this.modulos().map((modulo) => modulo.codigo)),
  );

  setSession(token: string): void {
    this._token.set(token);
    localStorage.setItem(TOKEN_KEY, token);
  }

  setMe(me: MeResponse): void {
    this._me.set(me);
    localStorage.setItem(ME_KEY, JSON.stringify(me));
  }

  /**
   * Limpia la sesión. Idempotente a propósito: el interceptor de 401 puede
   * dispararlo varias veces si varias requests en vuelo fallan a la vez.
   *
   * No toca el outbox ni los catálogos de IndexedDB: el trabajo pendiente del
   * usuario sobrevive al logout y se sincroniza cuando vuelva a entrar.
   */
  clear(): void {
    this._token.set(null);
    this._me.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ME_KEY);
  }

  /**
   * ¿El usuario tiene este permiso? Los guards de ruta se apoyan en esto.
   *
   * Un administrador de tenant pasa siempre: su rol de sistema tiene bypass en
   * el backend, y `permisos` puede llegar vacío aunque lo pueda todo.
   */
  hasPermiso(codigo: string): boolean {
    return this.esAdmin() || this.permisoCodigos().has(codigo);
  }

  hasAnyPermiso(codigos: readonly string[]): boolean {
    return codigos.some((codigo) => this.hasPermiso(codigo));
  }

  hasModulo(codigo: string): boolean {
    return this.moduloCodigos().has(codigo);
  }

  hasRol(nombre: string): boolean {
    return this.roles().includes(nombre);
  }
}

function leerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * El `me` cacheado permite pintar el shell (sidebar, nombre de usuario) en el
 * arranque en frío sin red, antes de que /api/core/me/ responda o falle.
 */
function leerMe(): MeResponse | null {
  const raw = localStorage.getItem(ME_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MeResponse;
  } catch {
    localStorage.removeItem(ME_KEY);
    return null;
  }
}
