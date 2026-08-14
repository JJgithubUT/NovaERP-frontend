/** @typedef {import('./common.model.js').DecimalString} DecimalString */
/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * @typedef {object} Cliente
 * @property {Uuid} id
 * @property {string | null} rfc_o_id_fiscal Opcional, a diferencia de Proveedor.
 * @property {string} razon_social
 * @property {string | null} correo
 * @property {string | null} telefono
 * @property {DecimalString} limite_credito
 * @property {boolean} activo
 */

/**
 * @typedef {object} ClienteCreate
 * @property {string | null} [rfc_o_id_fiscal]
 * @property {string} razon_social
 * @property {string | null} [correo]
 * @property {string | null} [telefono]
 * @property {DecimalString} [limite_credito]
 */

/**
 * @typedef {Partial<ClienteCreate>} ClienteUpdate
 */

export {};
