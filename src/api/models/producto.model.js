/** @typedef {import('./common.model.js').DecimalString} DecimalString */
/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * @typedef {object} Producto
 * @property {Uuid} id
 * @property {string} sku
 * @property {string} nombre
 * @property {string | null} descripcion
 * @property {DecimalString} costo_referencia
 * @property {DecimalString} precio_venta
 * @property {DecimalString} stock_minimo
 * @property {boolean} activo
 */

/**
 * @typedef {object} ProductoCreate
 * @property {string} sku
 * @property {string} nombre
 * @property {string | null} [descripcion]
 * @property {DecimalString} [costo_referencia]
 * @property {DecimalString} [precio_venta]
 * @property {DecimalString} [stock_minimo]
 */

/**
 * Todos los campos opcionales: el PATCH solo toca lo que se manda.
 *
 * @typedef {Partial<ProductoCreate>} ProductoUpdate
 */

export {};
