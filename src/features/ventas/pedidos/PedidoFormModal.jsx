import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as ventasApi from '../../../api/services/ventas.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { LineasEditor, lineaEsValida, lineaVacia } from '../LineasEditor';

const MAX_COTIZACIONES = 100;

/**
 * Alta y edición de pedido.
 *
 * Hay dos formas de crearlo y son excluyentes: desde una **cotización
 * aprobada** —el backend copia sus líneas— o capturando líneas directamente.
 * Solo se ofrecen cotizaciones en estado `aprobada`, porque son las únicas que
 * el backend acepta como origen.
 *
 * Al editar, el selector de origen desaparece: un pedido ya creado no cambia de
 * procedencia, solo de líneas, y únicamente mientras siga en borrador.
 *
 * @param {{
 *   pedido?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function PedidoFormModal({
  pedido = null,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const tenantSlug = useTenantSlug() ?? '';
  const esEdicion = pedido !== null;

  const [origen, setOrigen] = useState(esEdicion ? 'directo' : 'cotizacion');
  const [cotizacionId, setCotizacionId] = useState('');
  const [cliente, setCliente] = useState(/** @type {object | null} */ (null));
  const [lineas, setLineas] = useState(() =>
    pedido
      ? pedido.lineas.map((linea) => ({
          producto: { id: linea.producto_id, etiqueta: linea.producto_id.slice(0, 8) },
          cantidad: linea.cantidad,
          precio: linea.precio_unitario,
        }))
      : [lineaVacia()],
  );

  /** Editar siempre es por líneas: el origen ya no se puede cambiar. */
  const modoCotizacion = !esEdicion && origen === 'cotizacion';

  const filtros = { estado: 'aprobada', page_size: MAX_COTIZACIONES };
  const aprobadas = useQuery({
    queryKey: qk.lista(tenantSlug, 'cotizaciones', filtros),
    enabled: modoCotizacion && tenantSlug !== '',
    queryFn: () => ventasApi.listarCotizaciones(filtros).then((pagina) => pagina.results),
  });

  const valido = modoCotizacion
    ? cotizacionId !== ''
    : (esEdicion || cliente !== null) && lineas.length > 0 && lineas.every(lineaEsValida);

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function enviar() {
    if (!valido || enviando) return;

    if (modoCotizacion) {
      onGuardar({ cotizacion_id: cotizacionId });
      return;
    }

    onGuardar({
      cliente_id: cliente?.id ?? pedido?.cliente_id ?? '',
      lineas: lineas.map((linea) => ({
        producto_id: linea.producto.id,
        cantidad: linea.cantidad.trim(),
        ...(linea.precio.trim() === '' ? {} : { precio_unitario: linea.precio.trim() }),
      })),
    });
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${pedido.folio}` : 'Nuevo pedido'}
      ancho="lg"
      onCerrar={onCerrar}
      pie={
        <>
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primario"
            disabled={enviando || !valido}
            onClick={enviar}
          >
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      {errorGeneral ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {errorGeneral}
        </p>
      ) : null}

      {esEdicion ? null : (
        <Campo etiqueta="Origen del pedido" paraId="origen">
          <select
            id="origen"
            className="campo-control"
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
          >
            <option value="cotizacion">Desde una cotización aprobada</option>
            <option value="directo">Capturar líneas directamente</option>
          </select>
        </Campo>
      )}

      {modoCotizacion ? (
        <Campo
          etiqueta="Cotización aprobada"
          paraId="cotizacion"
          error={campoDeError(error) === 'cotizacion_id' ? mensajeDeError(error) : ''}
          ayuda="Se copiarán sus líneas al pedido."
        >
          <select
            id="cotizacion"
            className="campo-control"
            value={cotizacionId}
            onChange={(e) => setCotizacionId(e.target.value)}
          >
            <option value="">
              {aprobadas.isPending ? 'Cargando cotizaciones…' : 'Selecciona una cotización…'}
            </option>
            {(aprobadas.data ?? []).map((cot) => (
              <option key={cot.id} value={cot.id}>
                {cot.folio} · {formatMoneda(cot.total)}
              </option>
            ))}
          </select>
        </Campo>
      ) : (
        <>
          {esEdicion ? null : (
            <EntityCombo
              etiqueta="Cliente"
              tipo="cliente"
              valor={cliente}
              onValor={setCliente}
              marcador="Buscar por razón social…"
              error={campoDeError(error) === 'cliente_id' ? mensajeDeError(error) : ''}
            />
          )}

          <LineasEditor lineas={lineas} onLineas={setLineas} />
        </>
      )}
    </Modal>
  );
}
