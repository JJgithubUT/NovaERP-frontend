import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as coreApi from '../../../api/services/core.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Buscador } from '../../../shared/ui/Buscador';
import { Confirmar } from '../../../shared/ui/Confirmar';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { RolFormModal } from './RolFormModal';

const COLUMNAS = 6;

/**
 * Roles del tenant y sus permisos.
 *
 * La baja tiene un doble paso deliberado del backend: si el rol tiene usuarios
 * asignados responde **422** con cuántos son, y hay que repetir la llamada con
 * `desactivar: true` para confirmar. La pantalla lo aprovecha en vez de
 * esconderlo — la primera confirmación advierte, y si el backend contesta que
 * hay usuarios, la segunda dice exactamente cuántos se quedarán sin ese rol.
 *
 * Un rol de sistema nunca se desactiva (403), así que no se ofrece el botón.
 */
export function RolesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));
  const [enBaja, setEnBaja] = useState(/** @type {object | null} */ (null));
  /** Se activa cuando el backend ya avisó de que hay usuarios asignados. */
  const [forzar, setForzar] = useState(false);

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    search: busqueda,
    activo: soloActivos ? true : undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'roles', filtros),
    queryFn: () => coreApi.listarRoles(filtros),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'roles') });
    // Cambiar permisos de un rol cambia lo que puede hacer quien lo tenga.
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'usuarios') });
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion ? coreApi.editarRol(enEdicion.id, datos) : coreApi.crearRol(datos),
    onSuccess: () => {
      toasts.exito(enEdicion ? 'Rol actualizado.' : 'Rol creado.');
      refrescar();
      cerrarModal();
    },
  });

  const baja = useMutation({
    mutationFn: ({ rol, confirmado }) => coreApi.desactivarRol(rol.id, confirmado),
    onSuccess: () => {
      toasts.exito('Rol desactivado.');
      refrescar();
      cerrarBaja();
    },
    onError: (error) => {
      // El 422 de «tiene usuarios» no es un fallo: es la petición de confirmar.
      if (isApiError(error) && error.status === 422) setForzar(true);
    },
  });

  function abrir(rol) {
    guardado.reset();
    setEnEdicion(rol);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEnEdicion(null);
  }

  function cerrarBaja() {
    setEnBaja(null);
    setForzar(false);
    baja.reset();
  }

  /** Cuántos usuarios pierden el rol, si el backend lo dijo. */
  const usuariosAfectados = (() => {
    if (!isApiError(baja.error)) return null;
    const valor = baja.error.extra['usuarios_asignados'] ?? baja.error.extra['usuarios'];
    return typeof valor === 'number' ? valor : null;
  })();

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Roles</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Un rol agrupa permisos. Los de sistema no se editan ni se desactivan.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nuevo rol
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Buscador
          marcador="Buscar por nombre…"
          onBuscar={(texto) => {
            setBusqueda(texto);
            setPagina(1);
          }}
        />

        <label className="flex items-center gap-2 text-body-sm text-on-surface">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => {
              setSoloActivos(e.target.checked);
              setPagina(1);
            }}
          />
          Solo activos
        </label>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Rol</th>
              <th className="num">Permisos</th>
              <th className="num">Usuarios</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="No hay roles con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((rol) => {
                  const numPermisos = rol.permisos.reduce(
                    (suma, grupo) => suma + grupo.permisos.length,
                    0,
                  );

                  return (
                    <tr key={rol.id}>
                      <td className="font-medium">{rol.nombre}</td>
                      <td className="num tenue">{rol.acceso_total ? '—' : numPermisos}</td>
                      <td className="num tenue">{rol.usuarios_asignados}</td>
                      <td>
                        {rol.acceso_total ? (
                          <Badge tono="aviso">Acceso total</Badge>
                        ) : rol.es_sistema ? (
                          <Badge tono="info">Sistema</Badge>
                        ) : (
                          <Badge tono="neutro">Personalizado</Badge>
                        )}
                      </td>
                      <td>
                        <Badge tono={rol.activo ? 'exito' : 'neutro'}>
                          {rol.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <button type="button" className="btn-fila" onClick={() => abrir(rol)}>
                            <Pencil size={14} />
                            {rol.es_sistema ? 'Ver' : 'Editar'}
                          </button>

                          {!rol.es_sistema && rol.activo ? (
                            <button
                              type="button"
                              className="btn-fila"
                              onClick={() => {
                                setForzar(false);
                                baja.reset();
                                setEnBaja(rol);
                              }}
                            >
                              <Trash2 size={14} />
                              Desactivar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>

        <Paginacion
          page={pagina}
          count={consulta.data?.count ?? 0}
          numPages={consulta.data?.num_pages ?? 1}
          onPage={setPagina}
        />
      </div>

      {modalAbierto ? (
        <RolFormModal
          rol={enEdicion}
          enviando={guardado.isPending}
          error={guardado.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onCerrar={cerrarModal}
        />
      ) : null}

      {enBaja ? (
        <Confirmar
          titulo={`Desactivar ${enBaja.nombre}`}
          mensaje={
            forzar
              ? 'Este rol tiene usuarios asignados. Confirma para desactivarlo de todos modos.'
              : 'El rol dejará de poder asignarse.'
          }
          detalle={
            forzar
              ? usuariosAfectados !== null
                ? `${usuariosAfectados} ${usuariosAfectados === 1 ? 'usuario perderá' : 'usuarios perderán'} este rol y los permisos que otorga.`
                : 'Quienes lo tengan perderán los permisos que otorga.'
              : `Actualmente lo tienen ${enBaja.usuarios_asignados} ${enBaja.usuarios_asignados === 1 ? 'usuario' : 'usuarios'}.`
          }
          etiquetaConfirmar={forzar ? 'Desactivar de todos modos' : 'Desactivar'}
          peligroso
          enviando={baja.isPending}
          // El 422 de confirmación ya se explica arriba; no se repite como error.
          error={baja.error && !forzar ? mensajeDeError(baja.error) : ''}
          onConfirmar={() => baja.mutate({ rol: enBaja, confirmado: forzar })}
          onCancelar={cerrarBaja}
        />
      ) : null}
    </div>
  );
}
