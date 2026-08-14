import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import * as coreApi from '../../../api/services/core.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Modal } from '../../../shared/ui/Modal';

const MAX_ROLES = 100;

/**
 * Asignación y revocación de roles de un usuario.
 *
 * Dos guardas del backend que conviene anticipar en el texto, porque el 422 que
 * devuelven llega cuando el admin ya pulsó:
 *
 * - **Un usuario no se queda sin roles.** Revocar el último se rechaza.
 * - **No se revoca al último administrador activo.** Es la protección que
 *   impide dejar el tenant sin nadie que pueda administrarlo.
 *
 * Los roles asignados se muestran desde `rolesActuales` —lo que devolvió la
 * última operación— y no desde la fila del directorio: esa trae **nombres**, y
 * para revocar hacen falta los ids.
 *
 * @param {{
 *   usuario: object,
 *   rolesActuales: {id: string, nombre: string, es_sistema: boolean}[] | null,
 *   asignando?: boolean,
 *   revocandoId?: string | null,
 *   error?: unknown,
 *   onAsignar: (roles: string[]) => void,
 *   onRevocar: (rol: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function RolesUsuarioModal({
  usuario,
  rolesActuales,
  asignando = false,
  revocandoId = null,
  error = null,
  onAsignar,
  onRevocar,
  onCerrar,
}) {
  const tenantSlug = useTenantSlug() ?? '';
  const [seleccion, setSeleccion] = useState(/** @type {string[]} */ ([]));

  const filtros = { page_size: MAX_ROLES, activo: true };
  const catalogo = useQuery({
    queryKey: qk.lista(tenantSlug, 'roles', filtros),
    enabled: tenantSlug !== '',
    queryFn: () => coreApi.listarRoles(filtros).then((pagina) => pagina.results),
  });

  /*
   * Hasta que una asignación devuelva la lista con ids, solo se conocen los
   * nombres que trae el directorio. Se muestran igual —el admin quiere verlos—
   * pero sin botón de revocar, porque no hay id que mandar.
   */
  const asignados = rolesActuales ?? usuario.roles.map((nombre) => ({ id: null, nombre }));
  const nombresAsignados = new Set(asignados.map((r) => r.nombre));

  const disponibles = (catalogo.data ?? []).filter((rol) => !nombresAsignados.has(rol.nombre));

  function alternar(id) {
    setSeleccion((actual) =>
      actual.includes(id) ? actual.filter((r) => r !== id) : [...actual, id],
    );
  }

  function asignar() {
    if (seleccion.length === 0 || asignando) return;
    onAsignar(seleccion);
    setSeleccion([]);
  }

  return (
    <Modal
      titulo={`Roles de ${usuario.nombre_completo}`}
      onCerrar={onCerrar}
      pie={
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>
          Cerrar
        </button>
      }
    >
      {error ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {mensajeDeError(error)}
        </p>
      ) : null}

      <section>
        <h3 className="mb-1 text-label-caps uppercase text-on-surface-variant">Roles asignados</h3>
        <ul className="rounded-DEFAULT border border-outline-variant px-3">
          {asignados.length === 0 ? (
            <li className="py-3 text-center text-body-sm text-on-surface-variant">
              Sin roles asignados.
            </li>
          ) : (
            asignados.map((rol) => (
              <li
                key={rol.nombre}
                className="flex items-center justify-between gap-2 border-t border-outline-variant py-2 first:border-t-0"
              >
                <span className="text-body-sm text-on-surface">{rol.nombre}</span>
                <div className="flex items-center gap-2">
                  {rol.es_sistema ? <Badge tono="info">Sistema</Badge> : null}
                  {rol.id ? (
                    <button
                      type="button"
                      className="btn-fila"
                      disabled={revocandoId !== null}
                      onClick={() => onRevocar(rol)}
                    >
                      <Trash2 size={14} />
                      {revocandoId === rol.id ? 'Revocando…' : 'Revocar'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          No se puede dejar a un usuario sin roles, ni revocar al último administrador activo.
        </p>
      </section>

      <section>
        <h3 className="mb-1 text-label-caps uppercase text-on-surface-variant">Añadir roles</h3>
        {catalogo.isPending ? (
          <p className="text-body-sm text-on-surface-variant">Cargando roles…</p>
        ) : disponibles.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">
            No quedan roles activos por asignar.
          </p>
        ) : (
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-DEFAULT border border-outline-variant p-2">
            {disponibles.map((rol) => (
              <label key={rol.id} className="flex items-center gap-2 text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={seleccion.includes(rol.id)}
                  onChange={() => alternar(rol.id)}
                />
                {rol.nombre}
              </label>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primario mt-3"
          disabled={asignando || seleccion.length === 0}
          onClick={asignar}
        >
          {asignando ? 'Asignando…' : `Asignar ${seleccion.length || ''}`.trim()}
        </button>
      </section>
    </Modal>
  );
}
