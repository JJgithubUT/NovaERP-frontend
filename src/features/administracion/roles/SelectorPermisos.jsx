import { useQuery } from '@tanstack/react-query';
import * as coreApi from '../../../api/services/core.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';

/**
 * Selector del catálogo de permisos, agrupado por dominio.
 *
 * El detalle que gobierna esta pantalla son los permisos **inertes**: los de un
 * módulo que el tenant no tiene contratado. No autorizan nada y no se pueden
 * marcar, pero **se muestran igual**, atenuados y rotulados. Ocultarlos dejaría
 * al administrador preguntándose por qué no encuentra los permisos de Compras;
 * enseñarlos apagados le dice que existen y qué falta para poder usarlos.
 *
 * @param {{
 *   seleccion: string[],
 *   onSeleccion: (codigos: string[]) => void,
 *   deshabilitado?: boolean,
 * }} props
 */
export function SelectorPermisos({ seleccion, onSeleccion, deshabilitado = false }) {
  const tenantSlug = useTenantSlug() ?? '';

  const catalogo = useQuery({
    queryKey: qk.catalogo(tenantSlug, 'permisos'),
    enabled: tenantSlug !== '',
    queryFn: () => coreApi.catalogoPermisos(),
  });

  if (catalogo.fetchStatus === 'paused') {
    return <p className="text-body-sm text-error">Sin conexión con el servidor.</p>;
  }
  if (catalogo.isPending) {
    return <p className="text-body-sm text-on-surface-variant">Cargando permisos…</p>;
  }
  if (catalogo.error) {
    return (
      <p className="text-body-sm text-error">
        {mensajeDeError(catalogo.error, 'No se pudo cargar el catálogo de permisos.')}
      </p>
    );
  }

  const elegidos = new Set(seleccion);

  /** @param {string} codigo */
  function alternar(codigo) {
    onSeleccion(
      elegidos.has(codigo) ? seleccion.filter((c) => c !== codigo) : [...seleccion, codigo],
    );
  }

  /** Marca o desmarca de golpe los permisos utilizables de un dominio. */
  function alternarDominio(permisos, todosMarcados) {
    const utilizables = permisos.filter((p) => !p.inerte).map((p) => p.codigo);
    onSeleccion(
      todosMarcados
        ? seleccion.filter((c) => !utilizables.includes(c))
        : [...new Set([...seleccion, ...utilizables])],
    );
  }

  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto rounded-DEFAULT border border-outline-variant p-3">
      {(catalogo.data?.dominios ?? []).map((grupo) => {
        const utilizables = grupo.permisos.filter((p) => !p.inerte);
        const todosMarcados =
          utilizables.length > 0 && utilizables.every((p) => elegidos.has(p.codigo));

        return (
          <section key={grupo.dominio}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h4 className="text-label-caps uppercase text-on-surface-variant">{grupo.dominio}</h4>
              {utilizables.length > 0 ? (
                <button
                  type="button"
                  className="text-label-md text-action hover:underline disabled:opacity-50"
                  disabled={deshabilitado}
                  onClick={() => alternarDominio(grupo.permisos, todosMarcados)}
                >
                  {todosMarcados ? 'Ninguno' : 'Todos'}
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              {grupo.permisos.map((permiso) => (
                <label
                  key={permiso.codigo}
                  className={`flex items-start gap-2 text-body-sm ${
                    permiso.inerte ? 'opacity-50' : 'text-on-surface'
                  }`}
                  title={permiso.descripcion ?? ''}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={elegidos.has(permiso.codigo)}
                    disabled={deshabilitado || permiso.inerte}
                    onChange={() => alternar(permiso.codigo)}
                  />
                  <span className="min-w-0">
                    <span className="font-mono">{permiso.codigo}</span>
                    {permiso.inerte ? (
                      <span className="ml-2 text-label-md">· módulo no contratado</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
