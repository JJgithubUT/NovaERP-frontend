import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as coreApi from '../../../api/services/core.api';
import { descargarBlob } from '../../../api/services/reportes.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { Campo } from '../../../shared/ui/Campo';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatFechaHora } from '../../../shared/utils/fecha.util';

const COLUMNAS = 6;

const TONO_CRITICIDAD = { ALTA: 'error', NORMAL: 'info', BAJA: 'neutro' };

/**
 * Bitácora de auditoría.
 *
 * Es un registro **inmutable**: no hay altas, ediciones ni bajas, solo consulta
 * y exportación. Cada fila la escribió el backend al ejecutarse una operación.
 *
 * El detalle de cada evento trae `valores_antes` y `valores_despues`, que es lo
 * que permite responder «¿qué cambió exactamente?». Van plegados porque son
 * objetos completos y desplegados harían ilegible la tabla. Ambos son `null` en
 * los eventos de sesión (LOGIN, LOGOUT): ahí no hay fila que comparar.
 *
 * Exportar se audita a su vez como un evento `EXPORT`.
 */
export function BitacoraPage() {
  const tenantSlug = useTenantSlug() ?? '';

  const [pagina, setPagina] = useState(1);
  const [operacion, setOperacion] = useState('');
  const [entidad, setEntidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [expandido, setExpandido] = useState(/** @type {number | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    operacion: operacion || undefined,
    entidad: entidad || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'bitacora', filtros),
    queryFn: () => coreApi.bitacora(filtros),
  });

  const exportacion = useMutation({
    mutationFn: async (formato) => {
      // Sin `page`: la exportación devuelve el resultado completo del filtro.
      const { page, page_size, ...rango } = filtros;
      const blob = await coreApi.exportarBitacora(rango, formato);
      descargarBlob(blob, `bitacora.${formato}`);
    },
    onError: (error) => toasts.error(mensajeDeError(error, 'No se pudo exportar la bitácora.')),
  });

  const alCambiar = (set) => (e) => {
    set(e.target.value);
    setPagina(1);
  };

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Bitácora</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Registro inmutable de lo que ha ocurrido. Exportar queda auditado también.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secundario"
            disabled={exportacion.isPending}
            onClick={() => exportacion.mutate('csv')}
          >
            <Download size={16} />
            CSV
          </button>
          <button
            type="button"
            className="btn btn-secundario"
            disabled={exportacion.isPending}
            onClick={() => exportacion.mutate('pdf')}
          >
            <Download size={16} />
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Operación" paraId="f-operacion">
          <input
            id="f-operacion"
            className="campo-control font-mono"
            placeholder="CREATE, LOGIN…"
            value={operacion}
            onChange={alCambiar(setOperacion)}
          />
        </Campo>

        <Campo etiqueta="Entidad" paraId="f-entidad">
          <input
            id="f-entidad"
            className="campo-control font-mono"
            placeholder="Todas"
            value={entidad}
            onChange={alCambiar(setEntidad)}
          />
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
              <th />
              <th>Fecha</th>
              <th>Operación</th>
              <th>Entidad</th>
              <th>Criticidad</th>
              <th>Origen</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin eventos con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((evento) => {
                  const abierto = expandido === evento.id;
                  const hayDetalle =
                    evento.valores_antes !== null || evento.valores_despues !== null;

                  return [
                    <tr key={evento.id}>
                      <td>
                        {hayDetalle ? (
                          <button
                            type="button"
                            aria-label={abierto ? 'Ocultar detalle' : 'Ver detalle'}
                            aria-expanded={abierto}
                            onClick={() => setExpandido(abierto ? null : evento.id)}
                            className="text-on-surface-variant hover:text-on-surface"
                          >
                            {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : null}
                      </td>
                      <td className="tenue">{formatFechaHora(evento.ocurrido_en)}</td>
                      <td className="clave">{evento.operacion}</td>
                      <td>
                        {evento.entidad}
                        <span className="ml-2 font-mono text-label-md text-on-surface-variant">
                          {String(evento.entidad_id).slice(0, 8)}
                        </span>
                      </td>
                      <td>
                        <Badge tono={TONO_CRITICIDAD[evento.criticidad] ?? 'neutro'}>
                          {evento.criticidad}
                        </Badge>
                      </td>
                      <td className="tenue font-mono">{evento.ip_origen ?? '—'}</td>
                    </tr>,

                    abierto ? (
                      <tr key={`${evento.id}-detalle`}>
                        <td colSpan={COLUMNAS} className="bg-surface-container">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Valores titulo="Antes" datos={evento.valores_antes} />
                            <Valores titulo="Después" datos={evento.valores_despues} />
                          </div>
                        </td>
                      </tr>
                    ) : null,
                  ];
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

/** @param {{ titulo: string, datos: Record<string, unknown> | null }} props */
function Valores({ titulo, datos }) {
  return (
    <div>
      <h4 className="mb-1 text-label-caps uppercase text-on-surface-variant">{titulo}</h4>
      {datos === null ? (
        <p className="text-body-sm text-on-surface-variant">—</p>
      ) : (
        <pre className="max-h-48 overflow-auto rounded-sm border border-outline-variant bg-surface p-2 font-mono text-label-md text-on-surface">
          {JSON.stringify(datos, null, 2)}
        </pre>
      )}
    </div>
  );
}
