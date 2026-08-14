import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatCantidad, toDecimal } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { MOTIVO_AJUSTE_LABEL } from '../inventario.labels';
import { invalidarStock } from '../invalidarStock';
import { useCatalogoNombres } from '../useCatalogoNombres';
import { AjusteFormModal } from './AjusteFormModal';

const COLUMNAS = 5;

/**
 * Ajustes de inventario.
 *
 * Cada uno queda auditado: el backend registra quién lo aprobó. La cantidad va
 * con signo, y la tabla lo hace evidente pintando en verde lo que sumó y en
 * rojo lo que restó.
 */
export function AjustesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const nombres = useCatalogoNombres();

  const [pagina, setPagina] = useState(1);
  const [producto, setProducto] = useState(/** @type {object | null} */ (null));
  const [almacen, setAlmacen] = useState(/** @type {object | null} */ (null));
  const [modalAbierto, setModalAbierto] = useState(false);

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    producto_id: producto?.id,
    almacen_id: almacen?.id,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'ajustes', filtros),
    queryFn: () => inventarioApi.listarAjustes(filtros),
  });

  const alta = useMutation({
    mutationFn: (datos) => inventarioApi.crearAjuste(datos),
    onSuccess: () => {
      toasts.exito('Ajuste aplicado.');
      invalidarStock(queryClient, tenantSlug);
      setModalAbierto(false);
    },
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Ajustes</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Conteo físico, merma u otra causa. Cada ajuste queda auditado.
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
          Nuevo ajuste
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th>Motivo</th>
              <th className="num">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin ajustes con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((ajuste) => {
                  const suma = toDecimal(ajuste.cantidad).gt(0);

                  return (
                    <tr key={ajuste.id}>
                      <td className="tenue">{formatFechaHora(ajuste.created_at)}</td>
                      <td className="font-medium">{nombres.producto(ajuste.producto_id)}</td>
                      <td className="tenue">{nombres.almacen(ajuste.almacen_id)}</td>
                      <td>
                        <Badge tono="neutro">{MOTIVO_AJUSTE_LABEL[ajuste.motivo]}</Badge>
                      </td>
                      <td className={`num font-semibold ${suma ? 'text-success' : 'text-error'}`}>
                        {suma ? '+' : ''}
                        {formatCantidad(ajuste.cantidad)}
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
        <AjusteFormModal
          enviando={alta.isPending}
          error={alta.error}
          onGuardar={(datos) => alta.mutate(datos)}
          onCerrar={() => setModalAbierto(false)}
        />
      ) : null}
    </div>
  );
}
