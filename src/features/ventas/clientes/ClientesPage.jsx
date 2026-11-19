import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as ventasApi from '../../../api/services/ventas.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { isApiError } from '../../../core/errors/api-error.model';
import { useCatalogoConPendientes } from '../../../core/offline/catalogo-pendiente';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { MarcaPendiente } from '../../../shared/ui/MarcaPendiente';
import { Buscador } from '../../../shared/ui/Buscador';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { ClienteFormModal } from './ClienteFormModal';

const COLUMNAS = 6;

/** Los mismos campos por los que busca el backend: razón social o RFC. */
const CAMPOS_BUSQUEDA = ['razon_social', 'rfc_o_id_fiscal'];

/*
 * Referencia estable para «aún no hay datos»: un `[]` literal sería un array
 * nuevo en cada render y obligaría a recalcular la superposición siempre.
 */
const SIN_FILAS = [];

/**
 * Catálogo de clientes (FLUJO-VENTAS §6).
 *
 * La baja es lógica y además condicionada: el backend la rechaza si quedan
 * cuentas por cobrar abiertas. Como en el resto de catálogos, tampoco hay
 * reactivación desde la API.
 */
export function ClientesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(/** @type {object | null} */ (null));

  const filtros = { page: pagina, page_size: PAGE_SIZE_DEFAULT, search: busqueda };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'clientes', filtros),
    queryFn: () => ventasApi.listarClientes(filtros),
  });

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion ? ventasApi.editarCliente(enEdicion.id, datos) : ventasApi.crearCliente(datos),
    onSuccess: () => {
      toasts.exito(enEdicion ? 'Cliente actualizado.' : 'Cliente creado.');
      trasEscribir();
    },
    onError: avisarSiEncolado,
  });

  const baja = useMutation({
    mutationFn: (cliente) => ventasApi.darDeBajaCliente(cliente.id),
    onSuccess: () => {
      toasts.exito('Cliente dado de baja.');
      trasEscribir();
    },
    // Un 422 por saldo pendiente se queda en el modal: lo pinta con el importe.
    onError: avisarSiEncolado,
  });

  function trasEscribir() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'clientes') });
    cerrarModal();
  }

  /** @param {unknown} error */
  function avisarSiEncolado(error) {
    if (isApiError(error) && error.queued) {
      toasts.aviso(error.message);
      cerrarModal();
    }
  }

  function abrir(cliente) {
    guardado.reset();
    baja.reset();
    setEnEdicion(cliente);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEnEdicion(null);
  }

  /*
   * Las filas del servidor con los cambios del outbox encima: lo que el usuario
   * guardó sin red se ve en la tabla al instante, marcado como pendiente.
   */
  const filas = useCatalogoConPendientes('clientes', consulta.data?.results ?? SIN_FILAS, {
    tenantSlug,
    pagina,
    busqueda,
    camposBusqueda: CAMPOS_BUSQUEDA,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Clientes</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            El RFC es único por empresa. El límite de crédito gobierna la confirmación de pedidos.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      <Buscador
        marcador="Buscar por razón social o RFC…"
        onBuscar={(texto) => {
          setBusqueda(texto);
          setPagina(1);
        }}
      />

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>RFC</th>
              <th>Contacto</th>
              <th className="num">Límite crédito</th>
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
              mensajeVacio="No hay clientes. Registra el primero con «Nuevo cliente»."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="font-medium">
                      {cliente.razon_social}
                      <MarcaPendiente tipo={cliente._pendiente} />
                    </td>
                    <td className="clave tenue">{cliente.rfc_o_id_fiscal || '—'}</td>
                    <td className="tenue">{cliente.correo || cliente.telefono || '—'}</td>
                    <td className="num">{formatMoneda(cliente.limite_credito)}</td>
                    <td>
                      <Badge tono={cliente.activo ? 'exito' : 'neutro'}>
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {/*
                       * Un alta pendiente todavía no existe en el servidor: su
                       * id es temporal, y un PATCH o DELETE contra él daría 404
                       * al sincronizar. Se podrá editar en cuanto llegue.
                       */}
                      <button
                        type="button"
                        className="btn-fila"
                        disabled={cliente._pendiente === 'crear'}
                        title={
                          cliente._pendiente === 'crear'
                            ? 'Se podrá editar cuando se envíe al servidor.'
                            : undefined
                        }
                        onClick={() => abrir(cliente)}
                      >
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
        <ClienteFormModal
          cliente={enEdicion}
          enviando={guardado.isPending || baja.isPending}
          error={guardado.error ?? baja.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onDarDeBaja={(cliente) => baja.mutate(cliente)}
          onCerrar={cerrarModal}
        />
      ) : null}
    </div>
  );
}