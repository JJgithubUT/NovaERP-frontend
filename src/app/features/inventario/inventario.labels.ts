import type { MotivoAjuste, TipoMovimiento } from '../../api/models';
import type { BadgeTono } from '../../shared/ui/badge/badge.component';

/**
 * Traducción de los enums del backend a texto para pantalla.
 *
 * Vive fuera de los componentes porque el kardex, los movimientos y los ajustes
 * muestran los mismos valores: si cada tabla se inventara su rótulo, el mismo
 * `ajuste_positivo` acabaría escrito de tres formas distintas.
 */

export const TIPO_MOVIMIENTO_LABEL: Readonly<Record<TipoMovimiento, string>> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste_positivo: 'Ajuste (+)',
  ajuste_negativo: 'Ajuste (−)',
  transferencia_entrada: 'Transferencia · entrada',
  transferencia_salida: 'Transferencia · salida',
};

export const MOTIVO_AJUSTE_LABEL: Readonly<Record<MotivoAjuste, string>> = {
  conteo_fisico: 'Conteo físico',
  merma: 'Merma',
  otro: 'Otro',
};

/**
 * Verde lo que suma stock, rojo lo que lo resta.
 *
 * Es la lectura que interesa en el kardex: no *cómo* se generó el movimiento,
 * sino en qué dirección movió la existencia.
 */
export function tonoDeTipo(tipo: TipoMovimiento): BadgeTono {
  switch (tipo) {
    case 'entrada':
    case 'ajuste_positivo':
    case 'transferencia_entrada':
      return 'exito';
    case 'salida':
    case 'ajuste_negativo':
    case 'transferencia_salida':
      return 'error';
  }
}

/** Los tipos en el orden en que conviene ofrecerlos en un filtro. */
export const TIPOS_MOVIMIENTO = Object.keys(TIPO_MOVIMIENTO_LABEL) as readonly TipoMovimiento[];

export const MOTIVOS_AJUSTE = Object.keys(MOTIVO_AJUSTE_LABEL) as readonly MotivoAjuste[];
