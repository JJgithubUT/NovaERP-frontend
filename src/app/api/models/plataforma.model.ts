/**
 * Contrato de la superficie de plataforma (`/api/admin/*`), la del SysAdmin.
 *
 * Está separada del resto de modelos por la misma razón que lo está en el
 * backend: el SysAdmin no pertenece a ningún tenant, su token lleva
 * `typ='sysadmin'` y **no** lleva `tid`, y sus vistas no pasan por el
 * resolutor de permisos. Nada de aquí se cruza con `core.model.ts`.
 */

import type { TenantEstado } from './auth.model';
import type { Paginated, Uuid } from './common.model';

/* ------------------------------------------------------------------ tenant */
//
// `TenantEstado` vive en `auth.model.ts`: el ENUM es uno solo y las dos
// superficies leen el mismo. Aquí solo se consume.

/** El plan tal como lo incrusta el tenant serializado: sin `activo` ni módulos. */
export interface PlanContratado {
  codigo: string;
  nombre: string;
  licencias_max: number;
}

export interface Tenant {
  id: Uuid;
  slug: string;
  razon_social: string;
  dominio_comercial: string;
  plan: PlanContratado;
  estado: TenantEstado;
  motivo_suspension: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuloActivo {
  codigo: string;
  nombre: string;
  fase: number;
}

/** Consumo de licencias frente al techo del plan. Puede pasar del techo: bajar
 *  de plan no borra usuarios. */
export interface UsoLicencias {
  registrados: number;
  licencias_consumidas: number;
  licencias_max: number;
}

/** RF-02/CA05: el detalle añade módulos activos y consumo de licencias. */
export interface TenantDetalle extends Tenant {
  modulos_activos: ModuloActivo[];
  usuarios: UsoLicencias;
}

/**
 * El listado añade `mensaje` cuando no hay resultados. Viene redactado del
 * backend, así que la pantalla lo muestra tal cual en vez de inventar el suyo.
 */
export interface TenantListado extends Paginated<Tenant> {
  mensaje?: string;
}

export type OrdenTenant = 'razon_social' | 'created_at' | 'estado' | 'plan';

export interface TenantQuery {
  page?: number;
  page_size?: number;
  /** Razón social, dominio o UUID. */
  search?: string;
  estado?: TenantEstado | '';
  plan?: string;
  /** Fecha de alta, `YYYY-MM-DD`. */
  desde?: string;
  hasta?: string;
  orden?: OrdenTenant;
  desc?: boolean;
}

/* -------------------------------------------------------------- alta (RF-01) */

export interface AdminInicial {
  id: Uuid;
  correo: string;
  nombre_completo: string;
  estado: string;
}

export interface TenantCreate {
  /** Dominio comercial: `[a-z0-9-]{3,50}`, único en la plataforma e inmutable. */
  slug: string;
  razon_social: string;
  dominio_comercial: string;
  plan: string;
  nombre_completo: string;
  correo: string;
}

/**
 * El alta devuelve el token de activación **en claro una sola vez**: en la
 * tabla vive su hash. Si no se copia, la única salida es reenviarlo.
 */
export interface TenantCreado extends TenantDetalle {
  admin_inicial: AdminInicial;
  activacion_token: string;
}

/** Reemisión del enlace. Rota el token: el anterior deja de servir. */
export interface ReenvioActivacion {
  activacion_token: string;
  expira_en: string;
  admin_inicial: AdminInicial;
}

/** Canje del enlace por parte del administrador inicial. Endpoint público. */
export interface ActivarTenantRequest {
  token: string;
  password: string;
}

export interface TenantActivado extends TenantDetalle {
  admin_inicial: Pick<AdminInicial, 'id' | 'correo' | 'estado'>;
}

/* ----------------------------------------------------- edición (RF-03/RF-04) */

export interface CambioModulos {
  activar: string[];
  desactivar: string[];
}

export interface TenantUpdate {
  razon_social?: string;
  dominio_comercial?: string;
  plan?: string;
  modulos?: CambioModulos;
  /**
   * Apagar un módulo del que dependen otros activos exige confirmarlo. Sin
   * esto el backend responde 422 con `requiere_confirmar_cascada` y la lista
   * de afectados.
   */
  confirmar_cascada?: boolean;
}

export type TipoSuspension = 'administrativa' | 'cumplimiento';

export interface SuspenderTenant {
  tipo: TipoSuspension;
  motivo: string;
}

/** Suspender y dar de baja cierran todas las sesiones del tenant al instante. */
export interface TenantSuspendido extends Tenant {
  sesiones_revocadas: number;
}

/* --------------------------------------------------------------- catálogos */

export interface PlanCatalogo {
  codigo: string;
  nombre: string;
  licencias_max: number;
  /**
   * Un plan retirado sigue existiendo: hay tenants contratados en él. El alta
   * solo puede usar los vigentes — es lo que valida el POST.
   */
  activo: boolean;
  modulos: string[];
}

export interface ModuloCatalogo {
  codigo: string;
  nombre: string;
  fase: number;
  /** Fase 0. Nunca se puede desactivar: el backend lo rechaza con 422. */
  nucleo: boolean;
  depende_de: string[];
  requerido_por: string[];
  /** Planes que lo incluyen. Vacío = no contratable en ninguno. */
  planes: string[];
}

/**
 * Catálogo maestro de plataforma. Trae el mismo grafo de dependencias con el
 * que el backend valida la cascada, para que lo que el portal anticipe no
 * pueda divergir del 422.
 */
export interface CatalogosPlataforma {
  planes: PlanCatalogo[];
  modulos: ModuloCatalogo[];
  dominios_reservados: string[];
}

/* ----------------------------------------------------------------- sesión */

export interface SysadminLoginRequest {
  correo: string;
  password: string;
}

/** Login de una fase: sin MFA ni reto OTP, a diferencia del de tenant. */
export interface SysadminLoginResponse {
  token: string;
  mensaje: string;
}

export interface SysadminSesion {
  jti: string;
  emitida_en: string;
  /** Permite avisar del vencimiento sin decodificar el JWT. */
  expira_en: string;
  ip_origen: string | null;
}

export interface SysadminMe {
  id: Uuid;
  correo: string;
  activo: boolean;
  created_at: string;
  mfa_enrolado: boolean;
  sesion: SysadminSesion | null;
}
