import type { Uuid } from '../../api/models';

/** Catálogos que se precargan y se pueden mutar offline. */
export type Entidad = 'productos' | 'almacenes' | 'clientes' | 'proveedores';

export type OutboxEstado =
  /** Esperando red. */
  | 'pendiente'
  /** En vuelo ahora mismo. Evita que dos drenados manden lo mismo dos veces. */
  | 'enviando'
  /** El backend lo rechazó con un error definitivo. Requiere al usuario. */
  | 'fallido';

export type OutboxOperacion = 'crear' | 'actualizar' | 'baja';

/**
 * Una escritura capturada mientras no había red (Flujo 4).
 *
 * Guarda la petición entera —incluido el token— para que el Service Worker
 * pueda reproducirla tal cual desde el evento `sync`, sin la app corriendo.
 */
export interface OutboxItem {
  id: Uuid;
  tenantSlug: string;
  entidad: Entidad;
  operacion: OutboxOperacion;
  method: 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body: unknown;
  /**
   * Token vigente al momento de encolar. El JWT dura 8h y no hay refresh: si el
   * dispositivo pasa más tiempo offline, el replay dará 401 y el item queda
   * 'fallido' para que el usuario reintente ya autenticado.
   */
  token: string;
  createdAt: number;
  intentos: number;
  estado: OutboxEstado;
  ultimoError?: string;
  /**
   * Id temporal del registro creado localmente. Cuando el POST sincronice, el
   * backend devolverá el UUID real y hay que reconciliar.
   */
  tempId?: Uuid;
}

/** Tag del Background Sync. Debe coincidir con el que registra el SW. */
export const OUTBOX_SYNC_TAG = 'novaerp-outbox';
