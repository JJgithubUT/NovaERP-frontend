import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { LineasOrden, lineaOrdenEsValida, lineaOrdenVacia } from './LineasOrden';

/**
 * Alta y edición de orden de compra.
 *
 * Se consulta el umbral de aprobación para poder avisar **antes** de guardar de
 * que la orden nacerá retenida. El backend lo decide igual, pero descubrirlo
 * después de pulsar Guardar convierte una regla de negocio en una sorpresa.
 *
 * Editar solo es posible mientras no se haya recibido nada; de eso se encarga
 * la pantalla, que ni ofrece el botón en caso contrario.
 *
 * @param {{
 *   orden?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function OrdenFormModal({
  orden = null,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const tenantSlug = useTenantSlug() ?? '';
  const esEdicion = orden !== null;

  const [proveedor, setProveedor] = useState(/** @type {object | null} */ (null));
  const [lineas, setLineas] = useState(() =>
    orden
      ? orden.lineas.map((linea) => ({
          producto: { id: linea.producto_id, etiqueta: linea.producto_id.slice(0, 8) },
          cantidad: linea.cantidad,
          costo: linea.costo_unitario,
        }))
      : [lineaOrdenVacia()],
  );

  const config = useQuery({
    queryKey: qk.catalogo(tenantSlug, 'config-aprobacion'),
    enabled: tenantSlug !== '',
    queryFn: () => comprasApi.obtenerConfigAprobacion(),
  });

  const proveedorOk = esEdicion || proveedor !== null;
  const valido = proveedorOk && lineas.length > 0 && lineas.every(lineaOrdenEsValida);

  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function enviar() {
    if (!valido || enviando) return;

    const cuerpoLineas = lineas.map((linea) => ({
      producto_id: linea.producto.id,
      cantidad: linea.cantidad.trim(),
      costo_unitario: linea.costo.trim(),
    }));

    onGuardar(
      esEdicion ? { lineas: cuerpoLineas } : { proveedor_id: proveedor.id, lineas: cuerpoLineas },
    );
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${orden.folio}` : 'Nueva orden de compra'}
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
        <EntityCombo
          etiqueta="Proveedor"
          tipo="proveedor"
          valor={proveedor}
          onValor={setProveedor}
          marcador="Buscar por razón social o RFC…"
          error={campoDeError(error) === 'proveedor_id' ? mensajeDeError(error) : ''}
        />
      )}

      <LineasOrden
        lineas={lineas}
        onLineas={setLineas}
        umbral={config.data?.umbral_monto ?? null}
      />
    </Modal>
  );
}
