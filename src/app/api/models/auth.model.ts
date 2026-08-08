import type { Uuid } from './common.model';

export interface LoginRequest {
  tenant_slug: string;
  correo: string;
  password: string;
}

export interface LoginResponse {
  /** JWT HS256, vigente 8 horas. No hay refresh token todavía. */
  token: string;
  mensaje: string;
}

export type MfaModo = 'otp' | 'enroll';

/**
 * Respuesta de la fase 1 del login (`POST /api/auth/login/`). Nunca trae
 * `token`: el backend exige el segundo factor (RN07) antes de abrir sesión.
 */
export interface LoginChallengeResponse {
  /** JWT de corta vida (5 min) que identifica el reto ante `/api/auth/otp/`. */
  reto: string;
  /** `enroll` = primer login, hay que dar de alta el TOTP antes de validar. */
  mfa: MfaModo;
  /** Solo si `mfa === 'enroll'`. */
  secret?: string;
  /** Solo si `mfa === 'enroll'`. URI `otpauth://` para el authenticator. */
  otpauth_uri?: string;
  mensaje: string;
}

export interface OtpRequest {
  reto: string;
  codigo: string;
}

/** Payload del JWT. Se lee sin verificar firma: el backend es quien valida. */
export interface JwtPayload {
  /** Id del usuario (claim estándar `sub`). */
  sub: Uuid;
  /** Slug del tenant (claim `tid`). */
  tid: string;
  /** Expiración en segundos desde epoch (no milisegundos). */
  exp: number;
}

export type UsuarioEstado = 'pendiente' | 'activo' | 'suspendido' | 'pendiente_verificacion';

/**
 * `core.tenant_estado` completo. `pendiente` es el estado en el que nace una
 * organización recién creada por el SysAdmin, antes de que su administrador
 * inicial canjee el enlace de activación.
 *
 * En `MeTenant` no se verá nunca: el validador de sesión rechaza cualquier tenant
 * que no esté `activo`, así que quien llega a tener un `me` está en un entorno
 * activo por construcción. Está aquí, y no solo en el modelo de plataforma,
 * porque el ENUM es uno y duplicarlo dejaría dos definiciones que pueden
 * divergir.
 */
export type TenantEstado = 'activo' | 'pendiente' | 'suspendido' | 'baja_logica';

export interface MeUsuario {
  id: Uuid;
  nombre_completo: string;
  correo: string;
  estado: UsuarioEstado;
  mfa_enrolado: boolean;
  ultimo_acceso?: string | null;
}

export interface MeTenant {
  id: Uuid;
  slug: string;
  razon_social: string;
  estado: TenantEstado;
  plan: string;
}

export interface Permiso {
  codigo: string;
  dominio: string;
  recurso: string;
  accion: string;
}

/** Módulo habilitado para el tenant. Es la fuente del sidebar dinámico. */
export interface Modulo {
  codigo: string;
  nombre: string;
  fase: number;
}

export interface MeResponse {
  usuario: MeUsuario;
  tenant: MeTenant;
  roles: string[];
  /**
   * Rol de sistema con bypass: autoriza cualquier cosa sin pasar por el
   * catálogo de permisos. Es lo que decide si se muestra la administración,
   * porque un `TENANT_ADMIN` puede tener `permisos` vacío y aun así poder todo.
   */
  es_admin?: boolean;
  /** Puede venir vacío aunque haya roles, si `rol_permiso` no está poblado. */
  permisos: Permiso[];
  modulos: Modulo[];
}
