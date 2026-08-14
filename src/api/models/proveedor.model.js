/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * @typedef {object} Proveedor
 * @property {Uuid} id
 * @property {string} rfc_o_id_fiscal Obligatorio (NOT NULL en DB), a diferencia de Cliente.
 * @property {string} razon_social
 * @property {string | null} correo
 * @property {string | null} telefono
 * @property {boolean} activo
 */

/**
 * @typedef {object} ProveedorCreate
 * @property {string} rfc_o_id_fiscal
 * @property {string} razon_social
 * @property {string | null} [correo]
 * @property {string | null} [telefono]
 */

/**
 * @typedef {Partial<ProveedorCreate>} ProveedorUpdate
 */

export {};
