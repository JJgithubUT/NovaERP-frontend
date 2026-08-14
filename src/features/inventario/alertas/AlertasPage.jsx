import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Check } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Campo } from '../../../shared/ui/Campo';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatCantidad } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { useCatalogoNombres } from '../useCatalogoNombres';

const COLUMNAS = 6;

/**
 * Alertas de stock mínimo.
 *
 * Las crea el backend solo: cuando un movimiento deja la existencia por debajo
 * del `stock_minimo` del producto, aparece una fila aquí. No se dan de alta ni
 * se borran desde la interfaz.
 *
 * `cantidad_al_disparo` es la existencia **en el instante en que saltó**, no la
 * actual. Es un dato histórico, y por eso la columna lo dice explícitamente:
 * una alerta de hace tres días puede estar ya resuelta y su cifra seguiría
 * mostrando el momento del disparo.
 *
 * Marcar como notificada es acuse de recibo —«ya me enteré»—, no resolución: no
 * repone stock ni cierra nada.
 */
export function AlertasPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const nombres = useCatalogoNombres();

  const [pagina, setPagina] = useState(1);
  const [notificada, setNotificada] = useState('false');

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    // `false` es un valor con significado aquí, no una ausencia: `buildParams`
    // lo conserva y solo descarta la cadena vacía de «Todas».
    notificada: notificada === '' ? undefined : notificada === 'true',
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'alertas', filtros),
    queryFn: () => inventarioApi.listarAlertas(filtros),
  });

  const notificar = useMutation({
    mutationFn: (alerta) => inventarioApi.notificarAlerta(alerta.id),
    onSuccess: () => {
      toasts.exito('Alerta marcada como notificada.');
      void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'alertas') });
    },
    onError: (error) => toasts.error(mensajeDeError(error)),
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Alertas de stock mínimo</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Las genera el sistema cuando la existencia baja del mínimo del producto.
          </p>
        </div>

        <div className="sm:w-56">
          <Campo etiqueta="Estado" paraId="f-notificada">
            <select
              id="f-notificada"
              className="campo-control"
              value={notificada}
              onChange={(e) => {
                setNotificada(e.target.value);
                setPagina(1);
              }}
            >
              <option value="false">Pendientes</option>
              <option value="true">Notificadas</option>
              <option value="">Todas</option>
            </select>
          </Campo>
        </div>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Disparada</th>
              <th>Producto</th>
              <th>Almacén</th>
              <th className="num">Existencia al disparo</th>
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
              mensajeVacio="Ninguna alerta con este filtro. El inventario está por encima de los mínimos."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((alerta) => (
                  <tr key={alerta.id}>
                    <td className="tenue">{formatFechaHora(alerta.disparada_en)}</td>
                    <td className="font-medium">{nombres.producto(alerta.producto_id)}</td>
                    <td className="tenue">{nombres.almacen(alerta.almacen_id)}</td>
                    <td className="num">{formatCantidad(alerta.cantidad_al_disparo)}</td>
                    <td>
                      <Badge tono={alerta.notificada ? 'neutro' : 'aviso'}>
                        {alerta.notificada ? 'Notificada' : 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {alerta.notificada ? (
                        <span className="inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                          <Check size={14} />
                          Acusada
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-fila"
                          disabled={notificar.isPending}
                          onClick={() => notificar.mutate(alerta)}
                        >
                          <BellRing size={14} />
                          Marcar notificada
                        </button>
                      )}
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
    </div>
  );
}
