import { Download } from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { formatFechaHora } from '../../../shared/utils/fecha.util';

const PERMISO_EXPORTAR = 'ventas:reportes:exportar';

/** El backend rechaza un rango invertido o de más de 366 días. */
function rangoEsValido(modo, desde, hasta) {
  if (modo === 'corte') return true;
  if (desde === '' || hasta === '') return false;
  if (hasta < desde) return false;
  return (Date.parse(hasta) - Date.parse(desde)) / 86_400_000 <= 366;
}

/**
 * Barra de filtros y exportación común a los seis reportes.
 *
 * Los tres avisos que pinta no son decoración; cada uno cambia cómo hay que
 * leer las cifras de abajo:
 *
 * - **`alcanceVendedor`** — si viene con valor, quien mira no tiene
 *   `ventas:pipeline:ver_todo` y el reporte se acotó a sus propias cifras,
 *   pidiera lo que pidiera. Sin decirlo, confundiría «la empresa vendió poco»
 *   con «yo vendí poco».
 * - **`nota`** — advertencia metodológica del backend (por ejemplo, que el
 *   ranking de productos es importe bruto porque una nota de crédito no tiene
 *   desglose por línea).
 * - **`generadoEn`** — a qué momento corresponde lo que se está viendo.
 *
 * @param {{
 *   titulo: string,
 *   descripcion?: string,
 *   modo?: 'rango' | 'corte',
 *   desde?: string, hasta?: string, corte?: string,
 *   onDesde?: (v: string) => void,
 *   onHasta?: (v: string) => void,
 *   onCorte?: (v: string) => void,
 *   cargando?: boolean,
 *   exportando?: boolean,
 *   nota?: string,
 *   alcanceVendedor?: string | null,
 *   generadoEn?: string,
 *   onBuscar: () => void,
 *   onExportar: (formato: 'csv' | 'pdf') => void,
 *   children?: React.ReactNode,
 * }} props
 */
export function ReporteHeader({
  titulo,
  descripcion = '',
  modo = 'rango',
  desde = '',
  hasta = '',
  corte = '',
  onDesde,
  onHasta,
  onCorte,
  cargando = false,
  exportando = false,
  nota,
  alcanceVendedor = null,
  generadoEn,
  onBuscar,
  onExportar,
  children,
}) {
  const auth = useAuth();

  /*
   * Se ofrece exportar si el usuario tiene el permiso **o** si todavía no
   * sabemos qué permisos tiene.
   *
   * Lo segundo importa: `/api/core/me/` puede devolver `permisos` vacío aunque
   * el usuario tenga roles, si `rol_permiso` no está poblado. Ocultar el botón
   * en ese caso se lo quitaría a todo el mundo. Si de verdad falta el permiso,
   * el backend responde 403 y el aviso lo explica.
   */
  const permisos = auth.me()?.permisos;
  const desconocidos = permisos === undefined || permisos.length === 0;
  const puedeExportar = desconocidos || auth.hasPermiso(PERMISO_EXPORTAR);

  const valido = rangoEsValido(modo, desde, hasta);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
          {descripcion ? (
            <p className="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">{descripcion}</p>
          ) : null}
        </div>
        {generadoEn ? (
          <span className="text-label-md text-on-surface-variant">
            Generado: {formatFechaHora(generadoEn)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant bg-surface-container p-4">
        {modo === 'rango' ? (
          <>
            <div className="campo">
              <label
                className="text-label-caps uppercase text-on-surface-variant"
                htmlFor="rep-desde"
              >
                Desde
              </label>
              <input
                id="rep-desde"
                type="date"
                className="campo-control"
                value={desde}
                onChange={(e) => onDesde?.(e.target.value)}
              />
            </div>

            <div className="campo">
              <label
                className="text-label-caps uppercase text-on-surface-variant"
                htmlFor="rep-hasta"
              >
                Hasta
              </label>
              <input
                id="rep-hasta"
                type="date"
                className="campo-control"
                value={hasta}
                onChange={(e) => onHasta?.(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="campo">
            <label
              className="text-label-caps uppercase text-on-surface-variant"
              htmlFor="rep-corte"
            >
              Fecha de corte
            </label>
            <input
              id="rep-corte"
              type="date"
              className="campo-control"
              value={corte}
              onChange={(e) => onCorte?.(e.target.value)}
            />
          </div>
        )}

        {/* Filtros propios de cada reporte (agrupación, orden, top…). */}
        {children}

        <div className="ml-auto flex flex-wrap items-end gap-2">
          <button
            type="button"
            className="btn btn-primario"
            disabled={cargando || !valido}
            onClick={onBuscar}
          >
            {cargando ? 'Consultando…' : 'Consultar'}
          </button>

          {puedeExportar ? (
            <>
              <button
                type="button"
                className="btn btn-secundario"
                disabled={exportando}
                onClick={() => onExportar('csv')}
              >
                <Download size={16} />
                CSV
              </button>
              <button
                type="button"
                className="btn btn-secundario"
                disabled={exportando}
                onClick={() => onExportar('pdf')}
              >
                <Download size={16} />
                PDF
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!valido ? (
        <p role="alert" className="text-label-md text-error">
          «Hasta» no puede ser anterior a «Desde», y el rango no puede exceder 366 días.
        </p>
      ) : null}

      {alcanceVendedor ? (
        <p className="rounded-DEFAULT border border-outline-variant bg-info-container px-3 py-2 text-body-sm text-on-info-container">
          <strong className="font-semibold">Vista personal:</strong> estás viendo solo tus propias
          cifras. No tienes permiso para consultar las de otros vendedores.
        </p>
      ) : null}

      {nota ? (
        <p className="rounded-DEFAULT border border-outline-variant bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
          <strong className="font-semibold">Nota:</strong> {nota}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Fila de totales de un reporte, en tarjetas.
 *
 * @param {{ items: {etiqueta: string, valor: string, destacado?: boolean}[] }} props
 */
export function TotalesReporte({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.etiqueta}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3"
        >
          <p className="text-label-caps uppercase text-on-surface-variant">{item.etiqueta}</p>
          <p
            className={`font-mono tabular-nums ${
              item.destacado
                ? 'text-2xl font-bold text-action'
                : 'text-lg font-semibold text-on-surface'
            }`}
          >
            {item.valor}
          </p>
        </div>
      ))}
    </div>
  );
}
