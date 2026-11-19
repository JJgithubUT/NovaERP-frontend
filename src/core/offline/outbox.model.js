/** @typedef {import('../../api/models/common.model.js').Uuid} Uuid */

/**
 * Catálogos que se precargan y se pueden mutar offline.
 *
 * @typedef {'productos' | 'almacenes' | 'clientes' | 'proveedores'} Entidad
 */

/**
 * Estado de un elemento encolado:
 *
 * - `pendiente`: esperando red.
 * - `enviando`: en vuelo ahora mismo. Evita que dos drenados manden lo mismo
 *   dos veces.
 * - `fallido`: el backend lo rechazó con un error definitivo. Requiere al
 *   usuario.
 *
 * @typedef {'pendiente' | 'enviando' | 'fallido'} OutboxEstado
 */

/**
 * @typedef {'crear' | 'actualizar' | 'baja'} OutboxOperacion
 */

/**
 * Una escritura capturada mientras no había red (Flujo 4).
 *
 * Guarda la petición entera —incluido el token— para que el Service Worker
 * pueda reproducirla tal cual desde el evento `sync`, sin la app corriendo.
 *
 * @typedef {object} OutboxItem
 * @property {Uuid} id
 * @property {string} tenantSlug
 * @property {Entidad} entidad
 * @property {OutboxOperacion} operacion
 * @property {'POST' | 'PATCH' | 'DELETE'} method
 * @property {string} url
 * @property {unknown} body
 * @property {string} token Token vigente al momento de encolar. El JWT dura 8h y no hay refresh: si el dispositivo pasa más tiempo offline, el replay dará 401 y el item queda 'fallido' para que el usuario reintente ya autenticado.
 * @property {number} createdAt
 * @property {number} intentos
 * @property {OutboxEstado} estado
 * @property {number} [tomadoEn] Cuándo pasó a 'enviando'. Permite rescatar un item cuyo drenado murió a medias (ver `liberarAtascados`).
 * @property {string} [ultimoError]
 * @property {Uuid} [tempId] Id temporal del registro creado localmente. Cuando el POST sincronice, el backend devolverá el UUID real y hay que reconciliar.
 */

/**
 * Tag del Background Sync. Debe coincidir con el que registra el SW.
 */
export const OUTBOX_SYNC_TAG = 'novaerp-outbox';