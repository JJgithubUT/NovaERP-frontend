import { Clock } from 'lucide-react';

const TEXTOS = {
  crear: 'Alta pendiente',
  actualizar: 'Cambio pendiente',
  baja: 'Baja pendiente',
};

/**
 * Etiqueta de las filas que tienen un cambio guardado en el dispositivo y
 * todavía no confirmado por el servidor. Usa el azul informativo del sistema de
 * diseño, el mismo del banner de «cambios pendientes», para que se lea como
 * «en camino» y no como error.
 *
 * @param {{ tipo?: 'crear' | 'actualizar' | 'baja' }} props
 */
export function MarcaPendiente({ tipo }) {
  if (!tipo) return null;

  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-full bg-info-container px-2 py-0.5 align-middle text-label-md text-on-info-container"
      title="Se enviará al servidor cuando vuelva la conexión."
    >
      <Clock size={12} aria-hidden="true" />
      {TEXTOS[tipo]}
    </span>
  );
}
