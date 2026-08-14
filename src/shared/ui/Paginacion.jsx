import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Barra de paginación de los listados.
 *
 * Se apoya en `num_pages` del sobre del backend en vez de recalcularlo con
 * `ceil(count / page_size)`: el backend recorta `page_size` al rango [1, 100]
 * en silencio, así que si la pantalla pide 500 el cálculo local daría un número
 * de páginas que no existe.
 *
 * @param {{ page: number, count?: number, numPages?: number, onPage: (p: number) => void }} props
 */
export function Paginacion({ page, count = 0, numPages = 1, onPage }) {
  // Una lista vacía sigue siendo "página 1 de 1", no "de 0".
  const totalPaginas = Math.max(1, numPages);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-4 py-2.5 text-label-md text-on-surface-variant"
    >
      <span>
        {count} {count === 1 ? 'registro' : 'registros'} · página {page} de {totalPaginas}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex items-center gap-1 rounded-sm border border-outline-variant px-2.5 py-1 transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPaginas}
          onClick={() => onPage(page + 1)}
          className="flex items-center gap-1 rounded-sm border border-outline-variant px-2.5 py-1 transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
