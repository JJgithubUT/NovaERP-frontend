import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, X } from 'lucide-react';
import * as inventarioApi from '../../api/services/inventario.api';
import * as ventasApi from '../../api/services/ventas.api';
import * as comprasApi from '../../api/services/compras.api';
import { useTenantSlug } from '../../core/auth/useAuth';
import { qk } from '../../core/query/query-keys';

/**
 * @typedef {{ id: string, etiqueta: string, detalle?: string }} OpcionCombo
 * @typedef {'producto' | 'almacen' | 'cliente' | 'proveedor'} TipoEntidad
 */

/** @type {Readonly<Record<TipoEntidad, string>>} */
const RECURSO = {
  producto: 'productos',
  almacen: 'almacenes',
  cliente: 'clientes',
  proveedor: 'proveedores',
};

const DEBOUNCE_MS = 250;
const MAX_OPCIONES = 10;

/**
 * Selector con búsqueda para elegir un producto, almacén, cliente o proveedor.
 *
 * Existe porque los formularios piden `producto_id`, `cliente_id`… (UUID), pero
 * nadie se sabe un UUID: hay que buscar por SKU o por nombre y quedarse con el
 * id por detrás.
 *
 * Solo ofrece registros `activo: true`. Dar de baja un producto es precisamente
 * decir "ya no se opera con él", así que dejar elegirlo aquí sería empujar al
 * usuario hacia un 422.
 *
 * @param {{
 *   etiqueta: string,
 *   tipo: TipoEntidad,
 *   valor: OpcionCombo | null,
 *   onValor: (opcion: OpcionCombo | null) => void,
 *   marcador?: string,
 *   error?: string,
 * }} props
 */
export function EntityCombo({ etiqueta, tipo, valor, onValor, marcador = 'Buscar…', error = '' }) {
  const tenantSlug = useTenantSlug() ?? '';
  const host = useRef(/** @type {HTMLDivElement | null} */ (null));

  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);

  // Rebote: sin él, teclear "torn" dispara una petición por letra.
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    /** @param {MouseEvent} e */
    const alClicFuera = (e) => {
      if (host.current && !host.current.contains(/** @type {Node} */ (e.target))) setAbierto(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, []);

  const filtros = { search: busqueda, page_size: MAX_OPCIONES, activo: true };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, RECURSO[tipo], filtros),
    // Sin desplegar no hay nada que buscar; así abrir un formulario no dispara
    // peticiones que quizá nadie llegue a usar.
    enabled: abierto && tenantSlug !== '',
    queryFn: () => buscarOpciones(tipo, filtros),
  });

  const opciones = consulta.data ?? [];

  return (
    <div className="campo" ref={host}>
      <label className="campo-etiqueta">{etiqueta}</label>

      {valor ? (
        <div className="flex items-center justify-between gap-2 rounded-DEFAULT border border-outline bg-surface-container px-3 py-2.5">
          <span className="min-w-0 truncate text-body-md text-on-surface">
            {valor.etiqueta}
            {valor.detalle ? (
              <span className="ml-2 text-body-sm text-on-surface-variant">{valor.detalle}</span>
            ) : null}
          </span>
          <button
            type="button"
            aria-label="Quitar selección"
            onClick={() => {
              onValor(null);
              setAbierto(false);
            }}
            className="shrink-0 text-on-surface-variant transition-colors hover:text-error"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            className="campo-control pr-9"
            placeholder={marcador}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            aria-invalid={error !== ''}
          />
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />

          {abierto ? (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-DEFAULT border border-outline-variant bg-surface shadow-lg">
              {/* Igual que en las tablas: sin servidor, TanStack deja la
                  consulta en `paused` y `isPending` no se resuelve nunca. Sin
                  este caso el desplegable diría «Buscando…» indefinidamente. */}
              {consulta.fetchStatus === 'paused' ? (
                <li className="px-3 py-2 text-body-sm text-error">Sin conexión con el servidor.</li>
              ) : consulta.isPending ? (
                <li className="px-3 py-2 text-body-sm text-on-surface-variant">Buscando…</li>
              ) : consulta.error ? (
                <li className="px-3 py-2 text-body-sm text-error">No se pudo buscar.</li>
              ) : opciones.length === 0 ? (
                <li className="px-3 py-2 text-body-sm text-on-surface-variant">
                  Sin resultados activos.
                </li>
              ) : (
                opciones.map((opcion) => (
                  <li key={opcion.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onValor(opcion);
                        setAbierto(false);
                        setTexto('');
                      }}
                      className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-surface-container-high"
                    >
                      <span className="text-body-md text-on-surface">{opcion.etiqueta}</span>
                      {opcion.detalle ? (
                        <span className="text-body-sm text-on-surface-variant">
                          {opcion.detalle}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="campo-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * @param {TipoEntidad} tipo
 * @param {object} filtros
 * @returns {Promise<OpcionCombo[]>}
 */
async function buscarOpciones(tipo, filtros) {
  switch (tipo) {
    case 'producto': {
      const pagina = await inventarioApi.listarProductos(filtros);
      return pagina.results.map((p) => ({ id: p.id, etiqueta: `${p.sku} — ${p.nombre}` }));
    }
    case 'almacen': {
      const pagina = await inventarioApi.listarAlmacenes(filtros);
      return pagina.results.map((a) => ({
        id: a.id,
        etiqueta: a.nombre,
        detalle: a.ubicacion ?? undefined,
      }));
    }
    case 'cliente': {
      const pagina = await ventasApi.listarClientes(filtros);
      return pagina.results.map((c) => ({
        id: c.id,
        etiqueta: c.razon_social,
        detalle: c.rfc_o_id_fiscal ?? undefined,
      }));
    }
    case 'proveedor': {
      const pagina = await comprasApi.listarProveedores(filtros);
      return pagina.results.map((p) => ({
        id: p.id,
        etiqueta: p.razon_social,
        detalle: p.rfc_o_id_fiscal,
      }));
    }
    default:
      return [];
  }
}
