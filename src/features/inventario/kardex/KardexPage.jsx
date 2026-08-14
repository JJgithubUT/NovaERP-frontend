import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as inventarioApi from '../../../api/services/inventario.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Campo } from '../../../shared/ui/Campo';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { formatCantidad, formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFechaHora } from '../../../shared/utils/fecha.util';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_LABEL, tonoDeTipo } from '../inventario.labels';

const COLUMNAS = 7;

/**
 * Kardex: el histórico completo de movimientos de existencia.
 *
 * Es **inmutable por diseño** — no hay altas, ediciones ni bajas. Cada fila la
 * escribió el backend al procesar un movimiento, un ajuste, una transferencia,
 * una recepción de compra o una factura de venta. La columna «Referencia» es lo
 * que permite rastrear de dónde salió cada una.
 *
 * A diferencia de Stock y Valuación, este endpoint filtra por **SKU y nombre de
 * almacén en texto**, no por UUID, así que aquí no van los combos de búsqueda.
 */
export function KardexPage() {
  const tenantSlug = useTenantSlug() ?? '';

  const [pagina, setPagina] = useState(1);
  const [sku, setSku] = useState('');
  const [almacen, setAlmacen] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    sku: sku || undefined,
    almacen: almacen || undefined,
    tipo: tipo || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'kardex', filtros),
    queryFn: () => inventarioApi.listarKardex(filtros),
  });

  /** @param {(v: string) => void} set */
  const alCambiar = (set) => (e) => {
    set(e.target.value);
    setPagina(1);
  };

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-headline-sm text-on-surface">Kardex</h2>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          Histórico inmutable de existencias. Cada fila la escribió una operación del sistema.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Campo etiqueta="SKU" paraId="f-sku">
          <input
            id="f-sku"
            className="campo-control font-mono"
            placeholder="Todos"
            value={sku}
            onChange={alCambiar(setSku)}
          />
        </Campo>

        <Campo etiqueta="Almacén" paraId="f-almacen">
          <input
            id="f-almacen"
            className="campo-control"
            placeholder="Todos"
            value={almacen}
            onChange={alCambiar(setAlmacen)}
          />
        </Campo>

        <Campo etiqueta="Tipo" paraId="f-tipo">
          <select id="f-tipo" className="campo-control" value={tipo} onChange={alCambiar(setTipo)}>
            <option value="">Todos</option>
            {TIPOS_MOVIMIENTO.map((valor) => (
              <option key={valor} value={valor}>
                {TIPO_MOVIMIENTO_LABEL[valor]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Desde" paraId="f-desde">
          <input
            id="f-desde"
            type="date"
            className="campo-control"
            value={desde}
            onChange={alCambiar(setDesde)}
          />
        </Campo>

        <Campo etiqueta="Hasta" paraId="f-hasta">
          <input
            id="f-hasta"
            type="date"
            className="campo-control"
            value={hasta}
            onChange={alCambiar(setHasta)}
          />
        </Campo>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>SKU</th>
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
              ? filas.map((fila) => (
                  <tr key={fila.movimiento_id}>
                    <td className="tenue">{formatFechaHora(fila.ocurrido_en)}</td>
                    <td className="clave">{fila.sku}</td>
                    <td>
                      {fila.producto}
                      {fila.referencia_tipo ? (
                        <span className="ml-2 text-label-md text-on-surface-variant">
                          {fila.referencia_tipo}
                        </span>
                      ) : null}
                    </td>
                    <td className="tenue">{fila.almacen}</td>
                    <td>
                      <Badge tono={tonoDeTipo(fila.tipo)}>{TIPO_MOVIMIENTO_LABEL[fila.tipo]}</Badge>
                    </td>
                    <td className="num">{formatCantidad(fila.cantidad)}</td>
                    <td className="num tenue">
                      {fila.costo_unitario === null ? '—' : formatMoneda(fila.costo_unitario)}
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
