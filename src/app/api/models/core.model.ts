import type { UsuarioEstado } from './auth.model';
import type { Uuid } from './common.model';

/**
 * Dominio de Usuarios: directorio, roles, sesiones, seguridad y auditoría.
 * Espejo de la sección Núcleo del `openapi.yaml`.
 *
 * Sobre este dominio operan **dos actores** y el tipo no los distingue, pero la
 * UI sí debe hacerlo (FLUJO-USUARIOS §1): el administrador actúa sobre
 * cualquier usuario del tenant por permiso de catálogo; el propietario solo
 * sobre su propia cuenta y sin permiso ninguno.
 */

export interface Usuario {
  id: Uuid;
  correo: string;
  nombre_completo: string;
  telefono: string | null;
  puesto: string | null;
  departamento: string | null;
  estado: UsuarioEstado;
  /** No viene en las filas del directorio, solo en el detalle. */
  mfa_enrolado?: boolean;
  /** Nombres de rol, no ids. Para asignar hace falta `RolesDeUsuario`. */
  roles: string[];
  /** Solo en el directorio. */
  ultimo_acceso?: string | null;
  created_at: string;
}

/**
 * El alta devuelve el token **en claro una sola vez**.
 *
 * En producción llega por correo al usuario; en desarrollo viene aquí y es la
 * única oportunidad de copiarlo. La pantalla tiene que mostrarlo de forma
 * inequívoca, porque no hay endpoint para recuperarlo después.
 */
export interface UsuarioCreado extends Usuario {
  activacion_token?: string;
}

/** Cambiar el correo devuelve el token de reconfirmación, también una sola vez. */
export interface UsuarioActualizado extends Usuario {
  verificacion_token?: string;
}

export interface UsuarioCreate {
  correo: string;
  nombre_completo: string;
  /** Al menos uno. Son ids de rol, no nombres. */
  roles: Uuid[];
  telefono?: string;
  puesto?: string;
  departamento?: string;
}

/**
 * Lo que acepta el PATCH depende de quién lo manda: el admin puede tocar los
 * cinco campos; el propietario, solo `nombre_completo` y `telefono` (cualquier
 * otro → 422).
 */
export interface UsuarioUpdate {
  nombre_completo?: string;
  telefono?: string;
  correo?: string;
  puesto?: string;
  departamento?: string;
}

/** Conjunto vigente de roles tras asignar o revocar. */
export interface RolesDeUsuario {
  usuario_id: Uuid;
  roles: {
    id: Uuid;
    nombre: string;
    activo: boolean;
    es_sistema: boolean;
  }[];
}

/* ---------------------------------------------------------- roles y permisos */

/**
 * Entrada del catálogo maestro. El código es `dominio:recurso:accion`.
 *
 * No confundir con `Permiso` de `auth.model`: aquel es lo que `/me` dice que
 * **tú** tienes; este es el catálogo completo del que se arman los roles, y
 * lleva además descripción y la marca de inerte.
 */
export interface PermisoCatalogo {
  codigo: string;
  dominio: string;
  recurso: string;
  accion: string;
  descripcion: string | null;
  /**
   * Su módulo está desactivado en el tenant: no se puede elegir y no autoriza
   * nada. No se ocultan a propósito — así el admin entiende **por qué** no
   * puede marcarlos.
   */
  inerte: boolean;
}

export interface DominioPermisos {
  dominio: string;
  permisos: PermisoCatalogo[];
}

export interface CatalogoPermisos {
  dominios: DominioPermisos[];
}

/** Permisos del rol, ya agrupados por dominio. */
export interface PermisoDeRol {
  dominio: string;
  permisos: { codigo: string; inerte: boolean }[];
}

export interface Rol {
  id: Uuid;
  nombre: string;
  es_sistema: boolean;
  activo: boolean;
  /** `true` = rol de sistema con bypass: autoriza todo. */
  acceso_total: boolean;
  usuarios_asignados: number;
  permisos: PermisoDeRol[];
  created_at: string;
}

export interface RolCreate {
  nombre: string;
  /** Códigos `dominio:recurso:accion`, no ids. */
  permisos: string[];
}

export type RolUpdate = Partial<RolCreate>;

/* -------------------------------------------------------------- sesiones */

export interface Sesion {
  id: Uuid;
  /** Identificador del token. Es la clave para cerrarla. */
  jti: string;
  dispositivo: string | null;
  ip_origen: string | null;
  iniciada_en: string;
  ultima_actividad: string;
  expira_en: string;
  /** La sesión desde la que se está mirando. Cerrarla equivale a salir. */
  actual: boolean;
}

export interface SesionesResponse {
  results: Sesion[];
}

export interface RevocacionResponse {
  revocadas: number;
}

/* ------------------------------------------------------ seguridad y auditoría */

/** Rango que la plataforma permite en cada campo. El formulario valida contra esto. */
export interface LimitePlataforma {
  min: number;
  max: number;
}

export interface ConfigSeguridad {
  politica_password_min_len: number;
  politica_password_regex: string | null;
  jwt_expiracion_horas: number;
  intentos_max_ventana: number;
  ventana_minutos: number;
  bloqueo_minutos: number;
  /** `null` si el tenant nunca guardó su política: son los valores por defecto. */
  updated_at: string | null;
  limites_plataforma: Record<string, LimitePlataforma>;
}

export type ConfigSeguridadUpdate = Partial<
  Omit<ConfigSeguridad, 'updated_at' | 'limites_plataforma'>
>;

export type CriticidadEvento = 'BAJA' | 'NORMAL' | 'ALTA';

export interface EventoAuditoria {
  id: number;
  usuario_id: Uuid | null;
  entidad: string;
  entidad_id: string;
  /** `CREATE`/`UPDATE`/`DELETE`/`LOGIN`/`LOGIN_FAILED`/… */
  operacion: string;
  criticidad: CriticidadEvento;
  ip_origen: string | null;
  ocurrido_en: string;
  /** Fila anterior. `null` en INSERT y en eventos de sesión. */
  valores_antes: Record<string, unknown> | null;
  /** Fila resultante. `null` en DELETE y en eventos de sesión. */
  valores_despues: Record<string, unknown> | null;
}

export interface ActividadUsuario {
  usuario_id: Uuid;
  nombre_completo: string;
  correo: string;
  departamento: string | null;
  puesto: string | null;
  estado: UsuarioEstado;
  ultimo_acceso: string | null;
  num_sesiones: number;
  /** INSERT/UPDATE/DELETE auditados en el rango. */
  num_acciones_cud: number;
}

/* -------------------------------------------------------------- filtros */

export type OrdenUsuarios = 'nombre' | 'created_at' | 'ultimo_acceso';

export interface UsuarioQuery {
  page?: number;
  page_size?: number;
  /** Busca en nombre, correo y puesto. */
  search?: string;
  estado?: UsuarioEstado;
  rol?: Uuid;
  departamento?: string;
  desde?: string;
  hasta?: string;
  orden?: OrdenUsuarios;
  desc?: boolean;
}

export interface RolQuery {
  page?: number;
  page_size?: number;
  search?: string;
  /** `false` lista los roles dados de baja. */
  activo?: boolean;
}

export interface BitacoraQuery {
  page?: number;
  page_size?: number;
  usuario_id?: Uuid;
  operacion?: string;
  entidad?: string;
  desde?: string;
  hasta?: string;
}

export interface ActividadQuery {
  page?: number;
  page_size?: number;
  desde?: string;
  hasta?: string;
  departamento?: string;
  puesto?: string;
}

/** Activación de cuenta y reconfirmación de correo. Público, con token. */
export interface ActivarCuenta {
  token: string;
  /** Requerido en el alta; se omite al reconfirmar un correo. */
  password?: string;
}
