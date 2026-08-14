import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

const DEBOUNCE_MS = 300;

/**
 * Caja de búsqueda con rebote.
 *
 * El rebote no es un lujo: sin él, escribir "tornillo" dispara ocho peticiones
 * y las respuestas pueden llegar desordenadas, dejando en pantalla el resultado
 * de "torn" por encima del de "tornillo".
 *
 * Solo avisa al padre con el valor ya estabilizado, y solo si cambió respecto
 * del último emitido.
 *
 * @param {{ marcador?: string, onBuscar: (texto: string) => void }} props
 */
export function Buscador({ marcador = 'Buscar…', onBuscar }) {
  const [texto, setTexto] = useState('');
  const ultimoEmitido = useRef('');
  // En una ref para que cambiar el manejador no reinicie el temporizador.
  const alBuscar = useRef(onBuscar);
  alBuscar.current = onBuscar;

  useEffect(() => {
    const temporizador = setTimeout(() => {
      if (texto === ultimoEmitido.current) return;
      ultimoEmitido.current = texto;
      alBuscar.current(texto);
    }, DEBOUNCE_MS);

    return () => clearTimeout(temporizador);
  }, [texto]);

  return (
    <div className="flex items-center gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2 focus-within:border-action sm:w-80">
      <Search size={18} className="shrink-0 text-on-surface-variant" />
      <input
        type="search"
        aria-label={marcador}
        placeholder={marcador}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-gris-medio"
      />
    </div>
  );
}
