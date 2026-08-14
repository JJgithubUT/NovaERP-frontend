import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { Big, formatMoneda, toDecimal } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { useProveedorNombres } from '../useProveedorNombres';

const COLUMNAS = 6;

/**
 * Cuentas por pagar.
 *
 * Son de **solo lectura**: las crea el backend al registrar una recepción, y el
 * contrato no expone ningún endpoint para pagarlas o abonarlas. Por eso aquí no
 * hay acciones — mostrar un botón «Pagar» que no puede existir sería peor que
 * no mostrarlo.
 */
export function CuentasPorPagarPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const { proveedor: nombreProveedor } = useProveedorNombres();

  const [pagina, setPagina] = useState(1);
  const [proveedor, setProveedor] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    proveedor_id: proveedor?.id,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'cuentas-por-pagar', filtros),
    queryFn: () => comprasApi.listarCuentasPorPagar(filtros),
  });

  const filas = consulta.data?.results ?? [];

  const saldoPagina = filas.reduce((suma, cxp) => suma.plus(toDecimal(cxp.saldo)), new Big(0));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Cuentas por pagar</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Las genera cada recepción. Solo consulta: el registro de pagos no está en el API.
          </p>
        </div>

        {filas.length > 0 ? (
          <div className="text-right">
            <p className="text-label-caps uppercase text-on-surface-variant">Saldo en pantalla</p>
            <p className="font-mono text-xl font-bold tabular-nums text-on-surface">
              {formatMoneda(saldoPagina.toString())}
            </p>
          </div>
        ) : null}
      </div>

      <div className="sm:max-w-sm">
        <EntityCombo
          etiqueta="Proveedor"
          tipo="proveedor"
          valor={proveedor}
          onValor={(v) => {
            setProveedor(v);
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
              <th>Proveedor</th>
              <th>Origen</th>
              <th className="num">Monto original</th>
              <th className="num">Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin cuentas por pagar con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((cxp) => {
                  const pendiente = toDecimal(cxp.saldo).gt(0);

                  return (
                    <tr key={cxp.id}>
                      <td className="tenue">{formatFecha(cxp.created_at)}</td>
                      <td className="font-medium">{nombreProveedor(cxp.proveedor_id)}</td>
                      <td className="tenue">{cxp.origen_tipo}</td>
                      <td className="num tenue">{formatMoneda(cxp.monto_original)}</td>
                      <td className={`num font-semibold ${pendiente ? 'text-error' : ''}`}>
                        {formatMoneda(cxp.saldo)}
                      </td>
                      <td>
                        <Badge tono={pendiente ? 'aviso' : 'exito'}>
                          {pendiente ? 'Pendiente' : 'Liquidada'}
                        </Badge>
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
    </div>
  );
}
