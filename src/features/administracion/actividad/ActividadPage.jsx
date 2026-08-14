import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
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
import { ESTADO_USUARIO_LABEL, tonoUsuario } from '../administracion.labels';

const COLUMNAS = 6;

/**
 * Reporte de actividad por usuario.
 *
 * Responde a «¿quién está usando el sistema?». Dos matices sobre las cifras,
 * porque se malinterpretan con facilidad:
 *
 * - **Sesiones** cuenta inicios de sesión en el rango, no sesiones abiertas
 *   ahora.
 * - **Acciones** cuenta solo altas, cambios y bajas auditados (INSERT, UPDATE,
 *   DELETE). Consultar no deja rastro, así que alguien que solo lee informes
 *   aparecerá con cero acciones y no por ello está inactivo.
 */
export function ActividadPage() {
  const tenantSlug = useTenantSlug() ?? '';

  const [pagina, setPagina] = useState(1);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    desde: desde || undefined,
    hasta: hasta || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'actividad', filtros),
    queryFn: () => coreApi.reporteActividad(filtros),
  });

  const exportacion = useMutation({
    mutationFn: async (formato) => {
      const { page, page_size, ...rango } = filtros;
      const blob = await coreApi.exportarActividad(rango, formato);
      descargarBlob(blob, `actividad.${formato}`);
    },
    onError: (error) => toasts.error(mensajeDeError(error, 'No se pudo exportar el reporte.')),
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
          <h2 className="text-headline-sm text-on-surface">Actividad</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Uso del sistema por usuario. Consultar no deja rastro: cero acciones no es inactividad.
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

      <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
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
              <th>Usuario</th>
              <th>Departamento</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th className="num">Sesiones</th>
              <th className="num">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="Sin actividad en este rango."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((fila) => (
                  <tr key={fila.usuario_id}>
                    <td className="font-medium">
                      {fila.nombre_completo}
                      <p className="text-label-md text-on-surface-variant">{fila.correo}</p>
                    </td>
                    <td className="tenue">{fila.departamento || '—'}</td>
                    <td>
                      <Badge tono={tonoUsuario(fila.estado)}>
                        {ESTADO_USUARIO_LABEL[fila.estado]}
                      </Badge>
                    </td>
                    <td className="tenue">{formatFechaHora(fila.ultimo_acceso)}</td>
                    <td className="num">{fila.num_sesiones}</td>
                    <td className="num">{fila.num_acciones_cud}</td>
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
