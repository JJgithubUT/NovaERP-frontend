/**
 * Traducción de los enums del backend a texto para pantalla.
 *
 * Vive fuera de los componentes porque el kardex, los movimientos y los ajustes
 * muestran los mismos valores: si cada tabla se inventara su rótulo, el mismo
 * `ajuste_positivo` acabaría escrito de tres formas distintas.
 */

/** @typedef {import('../../api/models/inventario.model.js').TipoMovimiento} TipoMovimiento */
/** @typedef {import('../../api/models/inventario.model.js').MotivoAjuste} MotivoAjuste */
/** @typedef {import('../../shared/ui/Badge.jsx').BadgeTono} BadgeTono */

export const TIPO_MOVIMIENTO_LABEL = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste_positivo: 'Ajuste (+)',
  ajuste_negativo: 'Ajuste (−)',
  transferencia_entrada: 'Transferencia · entrada',
  transferencia_salida: 'Transferencia · salida',
};

export const MOTIVO_AJUSTE_LABEL = {
  conteo_fisico: 'Conteo físico',
  merma: 'Merma',
  otro: 'Otro',
};

/**
 * Verde lo que suma stock, rojo lo que lo resta.
 *
 * Es la lectura que interesa en el kardex: no *cómo* se generó el movimiento,
 * sino en qué dirección movió la existencia.
 *
 * @param {TipoMovimiento} tipo
 * @returns {BadgeTono}
 */
export function tonoDeTipo(tipo) {
  switch (tipo) {
    case 'entrada':
    case 'ajuste_positivo':
    case 'transferencia_entrada':
      return 'exito';
    default:
      return 'error';
  }
}

/** Los tipos en el orden en que conviene ofrecerlos en un filtro. */
export const TIPOS_MOVIMIENTO = Object.keys(TIPO_MOVIMIENTO_LABEL);

export const MOTIVOS_AJUSTE = Object.keys(MOTIVO_AJUSTE_LABEL);
