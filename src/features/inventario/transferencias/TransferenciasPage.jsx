import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatCantidad } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { invalidarStock } from '../invalidarStock';
import { useCatalogoNombres } from '../useCatalogoNombres';
import { TransferenciaFormModal } from './TransferenciaFormModal';

const COLUMNAS = 4;

/** Traslados entre almacenes. Salida y entrada atómicas, sin estado intermedio. */
export function TransferenciasPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const nombres = useCatalogoNombres();

  const [pagina, setPagina] = useState(1);
  const [producto, setProducto] = useState(/** @type {object | null} */ (null));
  const [modalAbierto, setModalAbierto] = useState(false);

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    producto_id: producto?.id,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'transferencias', filtros),
    queryFn: () => inventarioApi.listarTransferencias(filtros),
  });

  const alta = useMutation({
    mutationFn: (datos) => inventarioApi.crearTransferencia(datos),
    onSuccess: () => {
      toasts.exito('Transferencia aplicada.');
      invalidarStock(queryClient, tenantSlug);
      setModalAbierto(false);
    },
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Transferencias</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Mueven existencia entre almacenes sin alterar el total de la empresa.
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
          Nueva transferencia
        </button>
      </div>

      <div className="sm:max-w-sm">
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
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Ruta</th>
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
              mensajeVacio="Sin transferencias con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((t) => (
                  <tr key={t.id}>
                    <td className="tenue">{formatFechaHora(t.created_at)}</td>
                    <td className="font-medium">{nombres.producto(t.producto_id)}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-body-sm">
                        {nombres.almacen(t.almacen_origen_id)}
                        <ArrowRight size={14} className="text-on-surface-variant" />
                        {nombres.almacen(t.almacen_destino_id)}
                      </span>
                    </td>
                    <td className="num">{formatCantidad(t.cantidad)}</td>
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
        <TransferenciaFormModal
          enviando={alta.isPending}
          error={alta.error}
          onGuardar={(datos) => alta.mutate(datos)}
          onCerrar={() => setModalAbierto(false)}
        />
      ) : null}
    </div>
  );
}
