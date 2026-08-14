import { Construction } from 'lucide-react';
/**
 * Marcador honesto para las rutas cuyo módulo todavía no se ha portado desde la
 * rama Angular.
 *
 * Existe a propósito en vez de dejar la ruta sin definir o enseñar una pantalla
 * con datos de ejemplo: una ruta que no resuelve manda al 404 —lo que sugiere
 * que la sección no existe, cuando sí existe y está en camino— y una maqueta
 * con datos falsos se confunde con la aplicación real.
 *
 * Se borra conforme cada módulo queda conectado al API.
 */
export function PendientePage({ modulo }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">{modulo}</h1>
        <p className="text-body-md text-on-surface-variant">Módulo de gestión para novaERP</p>
      </header>

      <section className="tarjeta flex min-h-[350px] flex-col items-center justify-center p-8 text-center shadow-sm">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
          <Construction size={24} />
        </div>
        <h2 className="text-lg font-semibold text-on-surface">En migración</h2>
        <p className="mt-1 max-w-md text-body-md text-on-surface-variant">
          Esta sección se está trasladando desde la rama <code className="font-mono">login</code> y
          todavía no está conectada al API.
        </p>
      </section>
    </div>
  );
}
