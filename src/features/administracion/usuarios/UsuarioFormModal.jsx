import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as coreApi from '../../../api/services/core.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';

const MAX_ROLES = 100;

/**
 * Alta y edición de usuario.
 *
 * Tres reglas del backend que la pantalla refleja:
 *
 * - **Al crear hace falta al menos un rol.** No hay usuario sin rol, así que el
 *   selector es obligatorio en el alta y desaparece en la edición: cambiar
 *   roles es otra operación, con su propio modal.
 * - **Nunca se fija una contraseña desde aquí.** El backend rechaza cualquier
 *   credencial: el usuario la establece con el token de activación.
 * - **Cambiar el correo tiene consecuencia.** Deja al usuario en
 *   `pendiente_verificacion` —sin poder entrar— y devuelve un token de
 *   reconfirmación. Se advierte antes de guardar, no después.
 *
 * @param {{
 *   usuario?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function UsuarioFormModal({
  usuario = null,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const tenantSlug = useTenantSlug() ?? '';
  const esEdicion = usuario !== null;

  const [valores, setValores] = useState({
    correo: usuario?.correo ?? '',
    nombre_completo: usuario?.nombre_completo ?? '',
    telefono: usuario?.telefono ?? '',
    puesto: usuario?.puesto ?? '',
    departamento: usuario?.departamento ?? '',
  });
  const [roles, setRoles] = useState(/** @type {string[]} */ ([]));
  const [tocado, setTocado] = useState(false);

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  const filtros = { page_size: MAX_ROLES, activo: true };
  const catalogoRoles = useQuery({
    queryKey: qk.lista(tenantSlug, 'roles', filtros),
    enabled: !esEdicion && tenantSlug !== '',
    queryFn: () => coreApi.listarRoles(filtros).then((pagina) => pagina.results),
  });

  const correo = valores.correo.trim();
  const correoCambio = esEdicion && correo !== usuario.correo;

  const errores = {};
  if (!correo) errores.correo = 'Este campo es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'Correo no válido.';
  if (!valores.nombre_completo.trim()) errores.nombre_completo = 'Este campo es obligatorio.';
  if (!esEdicion && roles.length === 0) errores.roles = 'Elige al menos un rol.';

  const hayErrores = Object.keys(errores).length > 0;
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function errorDe(campo) {
    if (tocado && errores[campo]) return errores[campo];
    return campoDeError(error) === campo ? mensajeDeError(error) : '';
  }

  function alternarRol(id) {
    setRoles((actual) => (actual.includes(id) ? actual.filter((r) => r !== id) : [...actual, id]));
  }

  function enviar(evento) {
    evento?.preventDefault();
    if (hayErrores || enviando) {
      setTocado(true);
      return;
    }

    const base = {
      nombre_completo: valores.nombre_completo.trim(),
      telefono: valores.telefono.trim() || null,
      puesto: valores.puesto.trim(),
      departamento: valores.departamento.trim(),
    };

    onGuardar(
      esEdicion
        ? // Solo se manda el correo si de verdad cambió: mandarlo igual
          // dispararía la reverificación sin que nadie lo haya pedido.
          correoCambio
          ? { ...base, correo }
          : base
        : { ...base, correo, roles },
    );
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${usuario.nombre_completo}` : 'Nuevo usuario'}
      onCerrar={onCerrar}
      pie={
        <>
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" disabled={enviando} onClick={enviar}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      {errorGeneral ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {errorGeneral}
        </p>
      ) : null}

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre completo" paraId="nombre" error={errorDe('nombre_completo')}>
          <input
            id="nombre"
            className="campo-control"
            value={valores.nombre_completo}
            onChange={cambiar('nombre_completo')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <Campo
          etiqueta="Correo"
          paraId="correo"
          error={errorDe('correo')}
          ayuda={esEdicion ? '' : 'Recibirá aquí el enlace para fijar su contraseña.'}
        >
          <input
            id="correo"
            type="email"
            className="campo-control"
            value={valores.correo}
            onChange={cambiar('correo')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        {correoCambio ? (
          <p className="rounded-DEFAULT border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
            Al cambiar el correo, {usuario.nombre_completo} quedará sin poder entrar hasta
            reconfirmarlo con un código nuevo.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Puesto" paraId="puesto" error={errorDe('puesto')}>
            <input
              id="puesto"
              className="campo-control"
              value={valores.puesto}
              onChange={cambiar('puesto')}
            />
          </Campo>

          <Campo etiqueta="Departamento" paraId="depto" error={errorDe('departamento')}>
            <input
              id="depto"
              className="campo-control"
              value={valores.departamento}
              onChange={cambiar('departamento')}
            />
          </Campo>
        </div>

        <Campo etiqueta="Teléfono" paraId="telefono" error={errorDe('telefono')}>
          <input
            id="telefono"
            className="campo-control"
            value={valores.telefono}
            onChange={cambiar('telefono')}
          />
        </Campo>

        {esEdicion ? null : (
          <Campo
            etiqueta="Roles"
            paraId="roles"
            error={errorDe('roles')}
            ayuda="Al menos uno. Después podrás cambiarlos desde la fila del usuario."
          >
            <div
              id="roles"
              className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-DEFAULT border border-outline-variant p-2"
            >
              {catalogoRoles.isPending ? (
                <p className="text-body-sm text-on-surface-variant">Cargando roles…</p>
              ) : (catalogoRoles.data ?? []).length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  No hay roles activos. Crea uno en la pestaña «Roles».
                </p>
              ) : (
                (catalogoRoles.data ?? []).map((rol) => (
                  <label
                    key={rol.id}
                    className="flex items-center gap-2 text-body-sm text-on-surface"
                  >
                    <input
                      type="checkbox"
                      checked={roles.includes(rol.id)}
                      onChange={() => alternarRol(rol.id)}
                    />
                    {rol.nombre}
                    {rol.acceso_total ? (
                      <span className="text-label-md text-on-surface-variant">(acceso total)</span>
                    ) : null}
                  </label>
                ))
              )}
            </div>
          </Campo>
        )}

        <p className="text-body-sm text-on-surface-variant">
          La contraseña no se fija aquí: el usuario la establece con su código de activación.
        </p>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
