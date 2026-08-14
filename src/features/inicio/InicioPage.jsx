import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';
import * as ventasApi from '../../api/services/ventas.api';
import * as inventarioApi from '../../api/services/inventario.api';
import * as comprasApi from '../../api/services/compras.api';
import { useAuth, useTenantSlug } from '../../core/auth/useAuth';
import { useEstadoRed } from '../../core/offline/network-status';
import { usePendientes } from '../../core/offline/sync-queue';
import { qk } from '../../core/query/query-keys';
import { formatMoneda } from '../../shared/utils/decimal.util';
import { construirNavegacion } from '../../layout/navigation';

/**
 * Solo hace falta el `count` del sobre, no las filas. Pedir una por página es
 * la forma de obtenerlo sin descargar veinte registros que nadie va a mirar.
 */
const SOLO_CONTEO = { page_size: 1 };

/**
 * Panel de inicio.
 *
 * Todas las cifras salen del backend: los `count` del sobre paginado y el
 * `valor_ponderado_total` que calcula `/oportunidades/pipeline/`. Ninguna se
 * obtiene sumando la primera página en el cliente, que es lo que hacía la
 * maqueta — con 500 clientes habría mostrado «20», porque contaba el largo del
 * array recibido en vez del `count` real.
 *
 * Cada tarjeta se pide solo si el tenant tiene el módulo correspondiente: uno
 * sin Compras no dispara la consulta de órdenes ni ve su hueco vacío.
 *
 * El panel de estado reporta lo que la aplicación **sabe de verdad** —si hay
 * red y cuántos cambios esperan en la cola—. La maqueta traía un «Conexión con
 * base de datos: En línea» fijo en el HTML, que afirma algo que nadie comprobó.
 */
export function InicioPage() {
  const auth = useAuth();
  const tenantSlug = useTenantSlug() ?? '';
  const online = useEstadoRed();
  const pendientes = usePendientes();

  const usuario = auth.usuario();
  const tenant = auth.tenant();

  const tieneVentas = auth.hasModulo('VENTAS');
  const tieneInventario = auth.hasModulo('INVENTARIO');
  const tieneCompras = auth.hasModulo('COMPRAS');

  const consultas = useQueries({
    queries: [
      {
        queryKey: qk.lista(tenantSlug, 'clientes', SOLO_CONTEO),
        enabled: tieneVentas,
        queryFn: () => ventasApi.listarClientes(SOLO_CONTEO),
      },
      {
        queryKey: qk.catalogo(tenantSlug, 'pipeline'),
        enabled: tieneVentas,
        queryFn: () => ventasApi.obtenerPipeline(),
      },
      {
        queryKey: qk.lista(tenantSlug, 'alertas', { ...SOLO_CONTEO, notificada: false }),
        enabled: tieneInventario,
        queryFn: () => inventarioApi.listarAlertas({ ...SOLO_CONTEO, notificada: false }),
      },
      {
        queryKey: qk.lista(tenantSlug, 'ordenes-compra', SOLO_CONTEO),
        enabled: tieneCompras,
        queryFn: () => comprasApi.listarOrdenes(SOLO_CONTEO),
      },
    ],
  });

  const [clientes, pipeline, alertas, ordenes] = consultas;

  /** @type {{etiqueta: string, valor: string, ayuda: string, a: string}[]} */
  const tarjetas = [];

  if (tieneVentas) {
    tarjetas.push({
      etiqueta: 'Clientes',
      valor: textoConteo(clientes),
      ayuda: 'Registrados en la organización',
      a: `/${tenantSlug}/ventas/clientes`,
    });
    tarjetas.push({
      etiqueta: 'Pipeline ponderado',
      valor: pipeline.data
        ? formatMoneda(pipeline.data.valor_ponderado_total)
        : estadoCorto(pipeline),
      ayuda: 'Valor esperado de las oportunidades abiertas',
      a: `/${tenantSlug}/ventas/pipeline`,
    });
  }

  if (tieneInventario) {
    tarjetas.push({
      etiqueta: 'Alertas de stock',
      valor: textoConteo(alertas),
      ayuda: 'Productos por debajo de su mínimo, sin acusar',
      a: `/${tenantSlug}/inventario/alertas`,
    });
  }

  if (tieneCompras) {
    tarjetas.push({
      etiqueta: 'Órdenes de compra',
      valor: textoConteo(ordenes),
      ayuda: 'Registradas en total',
      a: `/${tenantSlug}/compras/ordenes`,
    });
  }

  const modulos = construirNavegacion(auth.modulos(), tenantSlug);
  const enCola = pendientes.filter((i) => i.estado !== 'fallido').length;

  return (
    <section className="flex flex-col gap-6">
      <header className="sombra-guinda flex flex-wrap items-end justify-between gap-4 rounded-lg bg-action px-6 py-6 text-on-action">
        <div>
          <h1 className="text-3xl font-bold">
            Hola, {usuario?.nombre_completo?.split(' ')[0] ?? 'usuario'}
          </h1>
          <p className="mt-1 text-body-md opacity-90">
            {tenant?.razon_social}
            {tenant?.plan ? ` · plan ${tenant.plan}` : ''}
          </p>
        </div>
      </header>

      {tarjetas.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tarjetas.map((tarjeta) => (
            <Link
              key={tarjeta.etiqueta}
              to={tarjeta.a}
              className="tarjeta flex flex-col gap-1 p-4 transition-colors hover:bg-surface-container"
            >
              <p className="text-label-caps uppercase text-on-surface-variant">
                {tarjeta.etiqueta}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-on-surface">
                {tarjeta.valor}
              </p>
              <p className="text-body-sm text-on-surface-variant">{tarjeta.ayuda}</p>
            </Link>
          ))}
        </div>
      ) : null}

      <section>
        <h2 className="mb-2 text-headline-sm text-on-surface">Módulos</h2>
        {modulos.length === 0 ? (
          <p className="tarjeta p-6 text-center text-body-sm text-on-surface-variant">
            Tu organización no tiene módulos habilitados todavía.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => {
              const Icono = modulo.icon;
              return (
                <Link
                  key={modulo.codigo}
                  to={modulo.link}
                  className="tarjeta flex items-center gap-3 p-4 transition-colors hover:bg-surface-container"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-action/10 text-action">
                    <Icono size={20} />
                  </span>
                  <span className="font-medium text-on-surface">{modulo.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-headline-sm text-on-surface">Estado</h2>
        <dl className="tarjeta divide-y divide-outline-variant">
          <Fila
            etiqueta="Conexión"
            valor={
              online ? (
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 size={16} /> Con red
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-error">
                  <CloudOff size={16} /> Sin red
                </span>
              )
            }
          />
          <Fila
            etiqueta="Cambios por sincronizar"
            valor={
              enCola === 0 ? (
                'Ninguno'
              ) : (
                <span className="flex items-center gap-1.5 text-on-surface">
                  <RefreshCw size={16} /> {enCola}
                </span>
              )
            }
          />
          <Fila etiqueta="Organización" valor={tenant?.slug ?? '—'} />
        </dl>
      </section>
    </section>
  );
}

/** @param {{etiqueta: string, valor: React.ReactNode}} props */
function Fila({ etiqueta, valor }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-body-sm text-on-surface-variant">{etiqueta}</dt>
      <dd className="text-body-sm font-medium text-on-surface">{valor}</dd>
    </div>
  );
}

/** El `count` del sobre, o el estado de la consulta mientras no llega. */
function textoConteo(consulta) {
  if (consulta.data) return String(consulta.data.count);
  return estadoCorto(consulta);
}

/**
 * Qué poner en la tarjeta mientras no hay cifra.
 *
 * Deliberadamente no dice «sin red»: el panel de estado de abajo informa de la
 * conexión, y son cosas distintas — `navigator.onLine` puede decir que hay red
 * y el backend no responder igualmente. Dos textos contradictorios en la misma
 * pantalla confunden más que un guion.
 */
function estadoCorto(consulta) {
  if (consulta.isPending || consulta.fetchStatus === 'paused') return '…';
  if (consulta.error) return '—';
  return '0';
}
