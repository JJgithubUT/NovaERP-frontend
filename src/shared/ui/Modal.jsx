import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Contador de modales abiertos. Ver `useBloquearScroll`. */
let abiertos = 0;

/**
 * Congela el scroll del fondo mientras haya un modal.
 *
 * El contador importa porque un modal puede abrir otro: si cada uno restaurara
 * el `overflow` al cerrarse, el primero en cerrar desbloquearía la página con
 * el segundo todavía encima.
 */
function useBloquearScroll() {
  useEffect(() => {
    const previo = document.body.style.overflow;
    if (abiertos === 0) document.body.style.overflow = 'hidden';
    abiertos += 1;

    return () => {
      abiertos -= 1;
      if (abiertos === 0) document.body.style.overflow = previo;
    };
  }, []);
}

/**
 * Diálogo modal: cabecera con título, cuerpo desplazable y pie de acciones.
 *
 * Solo se renderiza cuando el padre lo mete tras un condicional. Eso es
 * deliberado: así el formulario de dentro se monta y se desmonta con él, y no
 * hace falta un efecto que resetee los campos entre aperturas.
 *
 * @param {{
 *   titulo: string,
 *   ancho?: 'md' | 'lg',
 *   onCerrar: () => void,
 *   children: React.ReactNode,
 *   pie?: React.ReactNode,
 * }} props
 */
export function Modal({ titulo, ancho = 'md', onCerrar, children, pie }) {
  const contenedor = useRef(/** @type {HTMLDivElement | null} */ (null));

  useBloquearScroll();

  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const alTeclear = (e) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  useEffect(() => {
    // El foco entra al diálogo para que Tab y Escape actúen dentro y el lector
    // de pantalla anuncie el contexto nuevo en vez de seguir en la tabla.
    const foco = contenedor.current?.querySelector('input, select, textarea, button');
    if (foco instanceof HTMLElement) foco.focus();
  }, []);

  /**
   * Cierra solo si el clic empezó en el fondo. Se escucha `mousedown` y se
   * compara contra `currentTarget`: con `click` a secas, arrastrar el cursor
   * desde un input hasta fuera del cuadro cerraría el diálogo a media selección
   * de texto.
   *
   * @param {React.MouseEvent} evento
   */
  function alFondo(evento) {
    if (evento.target === evento.currentTarget) onCerrar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10"
      onMouseDown={alFondo}
    >
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`w-full rounded-lg border border-outline-variant bg-surface shadow-2xl ${
          ancho === 'lg' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
          <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>

        {pie ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant px-5 py-3.5">
            {pie}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
