import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Pencil, Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { isApiError } from '../../../core/errors/api-error.model';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Buscador } from '../../../shared/ui/Buscador';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { HistorialProveedorModal } from './HistorialProveedorModal';
import { ProveedorFormModal } from './ProveedorFormModal';

const COLUMNAS = 5;

/**
 * Catálogo de proveedores.
 *
 * La baja es lógica e **incondicional**, a diferencia de la de clientes: el
 * backend no comprueba deuda pendiente. Por eso la ficha de historial está a un
 * clic desde cada fila — es donde se ve si queda saldo antes de decidir.
 */
export function ProveedoresPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));
  const [enHistorial, setEnHistorial] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    search: busqueda,
    activo: soloActivos ? true : undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'proveedores', filtros),
    queryFn: () => comprasApi.listarProveedores(filtros),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'proveedores') });
    cerrarModal();
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion
        ? comprasApi.editarProveedor(enEdicion.id, datos)
        : comprasApi.crearProveedor(datos),
    onSuccess: () => {
      toasts.exito(enEdicion ? 'Proveedor actualizado.' : 'Proveedor creado.');
      refrescar();
    },
    onError: avisarSiEncolado,
  });

  const baja = useMutation({
    mutationFn: (proveedor) => comprasApi.darDeBajaProveedor(proveedor.id),
    onSuccess: () => {
      toasts.exito('Proveedor dado de baja.');
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

  function abrir(proveedor) {
    guardado.reset();
    baja.reset();
    setEnEdicion(proveedor);
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
          <h2 className="text-headline-sm text-on-surface">Proveedores</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            El RFC es obligatorio. Consulta el historial antes de dar de baja: la baja no comprueba
            deuda.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nuevo proveedor
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Buscador
          marcador="Buscar por razón social o RFC…"
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
              <th>Razón social</th>
              <th>RFC</th>
              <th>Contacto</th>
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
              mensajeVacio="No hay proveedores. Registra el primero con «Nuevo proveedor»."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((proveedor) => (
                  <tr key={proveedor.id}>
                    <td className="font-medium">{proveedor.razon_social}</td>
                    <td className="clave tenue">{proveedor.rfc_o_id_fiscal}</td>
                    <td className="tenue">{proveedor.correo || proveedor.telefono || '—'}</td>
                    <td>
                      <Badge tono={proveedor.activo ? 'exito' : 'neutro'}>
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn-fila"
                          onClick={() => setEnHistorial(proveedor)}
                        >
                          <History size={14} />
                          Historial
                        </button>
                        <button type="button" className="btn-fila" onClick={() => abrir(proveedor)}>
                          <Pencil size={14} />
                          Editar
                        </button>
                      </div>
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
        <ProveedorFormModal
          proveedor={enEdicion}
          enviando={guardado.isPending || baja.isPending}
          error={guardado.error ?? baja.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onDarDeBaja={(proveedor) => baja.mutate(proveedor)}
          onCerrar={cerrarModal}
        />
      ) : null}

      {enHistorial ? (
        <HistorialProveedorModal proveedor={enHistorial} onCerrar={() => setEnHistorial(null)} />
      ) : null}
    </div>
  );
}
