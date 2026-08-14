import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { isApiError } from '../../../core/errors/api-error.model';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Buscador } from '../../../shared/ui/Buscador';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { AlmacenFormModal } from './AlmacenFormModal';

const COLUMNAS = 4;

/** Catálogo de almacenes. Baja lógica, sin reactivación desde la API. */
export function AlmacenesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    search: busqueda,
    activo: soloActivos ? true : undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'almacenes', filtros),
    queryFn: () => inventarioApi.listarAlmacenes(filtros),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'almacenes') });
    cerrarModal();
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion
        ? inventarioApi.editarAlmacen(enEdicion.id, datos)
        : inventarioApi.crearAlmacen(datos),
    onSuccess: () => {
      toasts.exito(enEdicion ? 'Almacén actualizado.' : 'Almacén creado.');
      refrescar();
    },
    onError: avisarSiEncolado,
  });

  const baja = useMutation({
    mutationFn: (almacen) => inventarioApi.darDeBajaAlmacen(almacen.id),
    onSuccess: () => {
      toasts.exito('Almacén dado de baja.');
      refrescar();
    },
    onError: avisarSiEncolado,
  });

  /** @param {unknown} error */
  function avisarSiEncolado(error) {
    if (isApiError(error) && error.queued) {
      toasts.aviso(error.message);
      cerrarModal();
    }
  }

  function abrir(almacen) {
    guardado.reset();
    baja.reset();
    setEnEdicion(almacen);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEnEdicion(null);
  }

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Almacenes</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Un almacén inactivo deja de ofrecerse al mover stock, pero conserva su historial.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nuevo almacén
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
              <th>Nombre</th>
              <th>Ubicación</th>
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
              mensajeVacio="No hay almacenes. Registra el primero con «Nuevo almacén»."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((almacen) => (
                  <tr key={almacen.id}>
                    <td className="font-medium">{almacen.nombre}</td>
                    <td className="tenue">{almacen.ubicacion || '—'}</td>
                    <td>
                      <Badge tono={almacen.activo ? 'exito' : 'neutro'}>
                        {almacen.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <button type="button" className="btn-fila" onClick={() => abrir(almacen)}>
                        <Pencil size={14} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
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
        <AlmacenFormModal
          almacen={enEdicion}
          enviando={guardado.isPending || baja.isPending}
          error={guardado.error ?? baja.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onDarDeBaja={(almacen) => baja.mutate(almacen)}
          onCerrar={cerrarModal}
        />
      ) : null}
    </div>
  );
}
