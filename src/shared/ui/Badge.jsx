/**
 * Etiqueta de estado.
 *
 * Los tonos son tokens, no colores sueltos: `exito` se ve verde en claro y en
 * oscuro sin que la pantalla que lo usa tenga que saberlo. Escribir
 * `bg-emerald-50 text-emerald-700` directamente —como hacían las pantallas de
 * la maqueta— queda ilegible en cuanto se activa el tema oscuro.
 *
 * @typedef {'neutro' | 'exito' | 'aviso' | 'error' | 'info'} BadgeTono
 */

/** @type {Readonly<Record<BadgeTono, string>>} */
const TONOS = {
  neutro: 'bg-surface-container-high text-on-surface-variant',
  exito: 'bg-success-container text-on-success-container',
  aviso: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-info-container text-on-info-container',
};

/**
 * @param {{ tono?: BadgeTono, children: React.ReactNode }} props
 */
export function Badge({ tono = 'neutro', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-label-caps uppercase ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}
