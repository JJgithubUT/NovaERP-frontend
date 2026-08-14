import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { invalidarStock } from '../../inventario/invalidarStock';
import { useCatalogoNombres } from '../../inventario/useCatalogoNombres';
import { RecepcionFormModal } from './RecepcionFormModal';

const COLUMNAS = 4;

/**
 * Recepciones de mercancía.
 *
 * Una recepción no se edita ni se anula: su efecto sobre el inventario y sobre
 * las cuentas por pagar ya ocurrió. Corregir un error significa un ajuste de
 * inventario, no tocar esta tabla — por eso aquí no hay más acción que crear.
 */
export function RecepcionesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const nombres = useCatalogoNombres();

  const [pagina, setPagina] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);

  const filtros = { page: pagina, page_size: PAGE_SIZE_DEFAULT };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'recepciones', filtros),
    queryFn: () => comprasApi.listarRecepciones(filtros),
  });

  const alta = useMutation({
    mutationFn: (datos) => comprasApi.crearRecepcion(datos),
    onSuccess: () => {
      toasts.exito('Recepción registrada: stock sumado y cuenta por pagar creada.');
      // Toca inventario, órdenes y cuentas por pagar a la vez.
      invalidarStock(queryClient, tenantSlug);
      void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'recepciones') });
      void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'ordenes-compra') });
      void queryClient.invalidateQueries({
        queryKey: qk.catalogo(tenantSlug, 'cuentas-por-pagar'),
      });
      setModalAbierto(false);
    },
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Recepciones</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Suman stock y generan la cuenta por pagar. No se anulan: se corrigen con un ajuste de
            inventario.
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
          Nueva recepción
        </button>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Orden</th>
              <th>Almacén</th>
              <th className="num">Líneas</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin recepciones registradas."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((recepcion) => (
                  <tr key={recepcion.id}>
                    <td className="tenue">{formatFechaHora(recepcion.created_at)}</td>
                    <td className="clave">{recepcion.orden_id.slice(0, 8)}</td>
                    <td className="tenue">{nombres.almacen(recepcion.almacen_id)}</td>
                    <td className="num">{recepcion.lineas.length}</td>
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
        <RecepcionFormModal
          enviando={alta.isPending}
          error={alta.error}
          onGuardar={(datos) => alta.mutate(datos)}
          onCerrar={() => setModalAbierto(false)}
        />
      ) : null}
    </div>
  );
}
