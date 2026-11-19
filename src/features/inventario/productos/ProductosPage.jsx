import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
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
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { invalidarStock } from '../invalidarStock';
import { ProductoFormModal } from './ProductoFormModal';

const COLUMNAS = 7;

/** Los mismos campos por los que busca el backend: SKU o nombre. */
const CAMPOS_BUSQUEDA = ['sku', 'nombre'];

/*
 * Referencia estable para «aún no hay datos»: un `[]` literal sería un array
 * nuevo en cada render y obligaría a recalcular la superposición siempre.
 */
const SIN_FILAS = [];

/**
 * Catálogo de productos.
 *
 * La baja es **lógica**: el producto queda `activo: false` y su kardex se
 * conserva intacto. No hay reactivación desde la API, así que dar de baja es
 * una decisión que solo se revierte por base de datos — el modal lo advierte
 * antes de pulsar.
 */
export function ProductosPage() {
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
    queryKey: qk.lista(tenantSlug, 'productos', filtros),
    queryFn: () => inventarioApi.listarProductos(filtros),
  });

  /**
   * Cambiar el `stock_minimo` puede disparar o apagar alertas, y la valuación
   * usa el `costo_referencia`. No basta con refrescar el catálogo.
   */
  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'productos') });
    invalidarStock(queryClient, tenantSlug);
    cerrarModal();
  }

  const guardado = useMutation({
    mutationFn: (datos) =>
      enEdicion
        ? inventarioApi.editarProducto(enEdicion.id, datos)
        : inventarioApi.crearProducto(datos),
    onSuccess: () => {
      toasts.exito(enEdicion ? 'Producto actualizado.' : 'Producto creado.');
      refrescar();
    },
    onError: avisarSiEncolado,
  });

  const baja = useMutation({
    mutationFn: (producto) => inventarioApi.darDeBajaProducto(producto.id),
    onSuccess: () => {
      toasts.exito('Producto dado de baja.');
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

  function abrir(producto) {
    guardado.reset();
    baja.reset();
    setEnEdicion(producto);
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
  const filas = useCatalogoConPendientes('productos', consulta.data?.results ?? SIN_FILAS, {
    tenantSlug,
    pagina,
    busqueda,
    camposBusqueda: CAMPOS_BUSQUEDA,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Productos</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            El SKU es único por empresa y no cambia. La baja es lógica y conserva el kardex.
          </p>
        </div>

        <button type="button" className="btn btn-primario" onClick={() => abrir(null)}>
          <Plus size={18} />
          Nuevo producto
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Buscador
          marcador="Buscar por SKU o nombre…"
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
              <th>SKU</th>
              <th>Nombre</th>
              <th className="num">Costo ref.</th>
              <th className="num">Precio venta</th>
              <th className="num">Stock mínimo</th>
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
              mensajeVacio="No hay productos. Registra el primero con «Nuevo producto»."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((producto) => (
                  <tr key={producto.id}>
                    <td className="clave">{producto.sku}</td>
                    <td className="font-medium">
                      {producto.nombre}
                      <MarcaPendiente tipo={producto._pendiente} />
                    </td>
                    <td className="num tenue">{formatMoneda(producto.costo_referencia)}</td>
                    <td className="num">{formatMoneda(producto.precio_venta)}</td>
                    <td className="num tenue">{formatCantidad(producto.stock_minimo)}</td>
                    <td>
                      <Badge tono={producto.activo ? 'exito' : 'neutro'}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {/* Alta pendiente: id temporal, el PATCH daría 404. */}
                      <button
                        type="button"
                        className="btn-fila"
                        disabled={producto._pendiente === 'crear'}
                        title={
                          producto._pendiente === 'crear'
                            ? 'Se podrá editar cuando se envíe al servidor.'
                            : undefined
                        }
                        onClick={() => abrir(producto)}
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
        <ProductoFormModal
          producto={enEdicion}
          enviando={guardado.isPending || baja.isPending}
          error={guardado.error ?? baja.error}
          onGuardar={(datos) => guardado.mutate(datos)}
          onDarDeBaja={(producto) => baja.mutate(producto)}
          onCerrar={cerrarModal}
        />
      ) : null}
    </div>
  );
}