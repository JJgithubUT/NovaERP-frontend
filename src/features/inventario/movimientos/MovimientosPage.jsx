import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_LABEL, tonoDeTipo } from '../inventario.labels';
import { invalidarStock } from '../invalidarStock';
import { useCatalogoNombres } from '../useCatalogoNombres';
import { MovimientoFormModal } from './MovimientoFormModal';

const COLUMNAS = 6;

/**
 * Movimientos de inventario: la tabla transaccional cruda.
 *
 * Se diferencia del kardex en que aquí se **capturan** entradas y salidas
 * manuales. El kardex es la vista de solo lectura que además incluye los
 * movimientos que generan otras operaciones (ventas, compras, transferencias).
 *
 * Un movimiento no se edita ni se borra: para corregirlo se registra otro en
 * sentido contrario, o un ajuste.
 */
export function MovimientosPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const nombres = useCatalogoNombres();

  const [pagina, setPagina] = useState(1);
  const [producto, setProducto] = useState(/** @type {object | null} */ (null));
  const [almacen, setAlmacen] = useState(/** @type {object | null} */ (null));
  const [tipo, setTipo] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    producto_id: producto?.id,
    almacen_id: almacen?.id,
    tipo: tipo || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'movimientos', filtros),
    queryFn: () => inventarioApi.listarMovimientos(filtros),
  });

  const alta = useMutation({
    mutationFn: (datos) => inventarioApi.crearMovimiento(datos),
    onSuccess: () => {
      toasts.exito('Movimiento registrado.');
      invalidarStock(queryClient, tenantSlug);
      setModalAbierto(false);
    },
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Movimientos</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Entradas y salidas manuales. Para corregir uno, registra otro en sentido contrario.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primario"
          onClick={() => {
            alta.reset();
            setModalAbierto(true);
          }}
        >
          <Plus size={18} />
          Nuevo movimiento
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <EntityCombo
          etiqueta="Producto"
          tipo="producto"
          valor={producto}
          onValor={(v) => {
            setProducto(v);
            setPagina(1);
          }}
          marcador="Todos…"
        />
        <EntityCombo
          etiqueta="Almacén"
          tipo="almacen"
          valor={almacen}
          onValor={(v) => {
            setAlmacen(v);
            setPagina(1);
          }}
          marcador="Todos…"
        />
        <Campo etiqueta="Tipo" paraId="f-tipo">
          <select
            id="f-tipo"
            className="campo-control"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            {TIPOS_MOVIMIENTO.map((valor) => (
              <option key={valor} value={valor}>
                {TIPO_MOVIMIENTO_LABEL[valor]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th>Tipo</th>
              <th className="num">Cantidad</th>
              <th className="num">Costo unit.</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin movimientos con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((mov) => (
                  <tr key={mov.id}>
                    <td className="tenue">{formatFechaHora(mov.ocurrido_en)}</td>
                    <td className="font-medium">{nombres.producto(mov.producto_id)}</td>
                    <td className="tenue">{nombres.almacen(mov.almacen_id)}</td>
                    <td>
                      <Badge tono={tonoDeTipo(mov.tipo)}>{TIPO_MOVIMIENTO_LABEL[mov.tipo]}</Badge>
                    </td>
                    <td className="num">{formatCantidad(mov.cantidad)}</td>
                    <td className="num tenue">
                      {mov.costo_unitario === null ? '—' : formatMoneda(mov.costo_unitario)}
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
        <MovimientoFormModal
          enviando={alta.isPending}
          error={alta.error}
          onGuardar={(datos) => alta.mutate(datos)}
          onCerrar={() => setModalAbierto(false)}
        />
      ) : null}
    </div>
  );
}
