/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * @typedef {object} Almacen
 * @property {Uuid} id
 * @property {string} nombre
 * @property {string | null} ubicacion
 * @property {boolean} activo
 */

/**
 * @typedef {object} AlmacenCreate
 * @property {string} nombre
 * @property {string | null} [ubicacion]
 */

/**
 * @typedef {Partial<AlmacenCreate>} AlmacenUpdate
 */

export {};
