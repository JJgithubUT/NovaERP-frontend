import { useQuery } from '@tanstack/react-query';
import * as ventasApi from '../../../api/services/ventas.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { ETAPAS, ETAPA_LABEL } from '../ventas.labels';

/**
 * Embudo comercial por etapa (RF-33).
 *
 * Es un **agregado**, no un listado: el backend devuelve un total por etapa, no
 * las oportunidades. Por eso las tarjetas no se pueden arrastrar de una columna
 * a otra — mover una oportunidad se hace desde su fila en «Oportunidades», que
 * es donde está el botón de avanzar etapa.
 *
 * El valor ponderado es el valor por la probabilidad que el backend asigna a
 * cada etapa. Es la cifra que sirve para pronosticar; el valor bruto siempre se
 * ve más alto de lo que acabará cerrándose.
 */
export function PipelinePage() {
  const tenantSlug = useTenantSlug() ?? '';

  const consulta = useQuery({
    queryKey: qk.catalogo(tenantSlug, 'pipeline'),
    queryFn: () => ventasApi.obtenerPipeline(),
  });

  /*
   * El encabezado se pinta siempre, también mientras carga o falla: si la
   * pantalla entera se sustituye por un aviso, el usuario pierde el título y el
   * contexto de dónde está, y solo le queda la pestaña para orientarse.
   */
  const aviso =
    consulta.fetchStatus === 'paused'
      ? 'Sin conexión con el servidor. Se reintentará al recuperarla.'
      : consulta.isPending
        ? 'Cargando embudo…'
        : consulta.error
          ? mensajeDeError(consulta.error, 'No se pudo cargar el embudo.')
          : null;

  const esError = aviso !== null && !consulta.isPending;

  const porEtapa = new Map((consulta.data?.etapas ?? []).map((e) => [e.etapa, e]));

  /*
   * Se recorre `ETAPAS`, no lo que vino del backend: una etapa sin
   * oportunidades no aparece en la respuesta, y saltársela rompería la lectura
   * del embudo — que es justamente ver dónde se vacía.
   */
  const columnas = ETAPAS.map((etapa) => ({
    etapa,
    datos: porEtapa.get(etapa) ?? {
      etapa,
      num_oportunidades: 0,
      valor_total: '0',
      probabilidad: 0,
      valor_ponderado: '0',
    },
  }));

  const maximo = Math.max(1, ...columnas.map((c) => c.datos.num_oportunidades));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Pipeline CRM</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Oportunidades abiertas por etapa. Para moverlas, ve a «Oportunidades».
          </p>
        </div>

        <div className="text-right">
          <p className="text-label-caps uppercase text-on-surface-variant">Ponderado total</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-action">
            {formatMoneda(consulta.data?.valor_ponderado_total ?? '0')}
          </p>
        </div>
      </div>

      {aviso ? <Aviso tono={esError ? 'error' : 'tenue'}>{aviso}</Aviso> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {columnas.map(({ etapa, datos }) => (
          <article
            key={etapa}
            className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
          >
            <header className="flex items-baseline justify-between gap-2">
              <h3 className="text-body-md font-semibold text-on-surface">{ETAPA_LABEL[etapa]}</h3>
              <span className="text-label-md text-on-surface-variant">{datos.probabilidad}%</span>
            </header>

            <p className="font-mono text-3xl font-bold tabular-nums text-on-surface">
              {datos.num_oportunidades}
            </p>

            {/* Barra proporcional a la columna más poblada: da de un vistazo
                dónde se acumula y dónde se seca el embudo. */}
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-action"
                style={{ width: `${(datos.num_oportunidades / maximo) * 100}%` }}
              />
            </div>

            <dl className="flex flex-col gap-1 text-body-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Valor</dt>
                <dd className="font-mono tabular-nums text-on-surface">
                  {formatMoneda(datos.valor_total)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Ponderado</dt>
                <dd className="font-mono font-semibold tabular-nums text-on-surface">
                  {formatMoneda(datos.valor_ponderado)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

/** @param {{ tono?: 'tenue' | 'error', children: React.ReactNode }} props */
function Aviso({ tono = 'tenue', children }) {
  return (
    <p
      className={`rounded-lg border border-outline-variant p-8 text-center text-body-sm ${
        tono === 'error' ? 'text-error' : 'text-on-surface-variant'
      }`}
    >
      {children}
    </p>
  );
}
