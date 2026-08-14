import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';
import { isNonNegative } from '../../../shared/utils/decimal.util';

/**
 * Alta y edición de producto.
 *
 * El SKU es único por empresa y **no se puede cambiar** una vez creado: es la
 * clave con la que el kardex referencia los movimientos históricos. Al editar
 * se muestra deshabilitado en vez de ocultarlo, porque saber cuál es sigue
 * siendo útil.
 *
 * `stock_minimo` es lo que dispara las alertas: en cuanto la existencia baja de
 * ese número, el backend crea una fila en alertas de stock mínimo.
 *
 * @param {{
 *   producto?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onDarDeBaja: (producto: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function ProductoFormModal({
  producto = null,
  enviando = false,
  error = null,
  onGuardar,
  onDarDeBaja,
  onCerrar,
}) {
  const esEdicion = producto !== null;

  const [valores, setValores] = useState({
    sku: producto?.sku ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    costo_referencia: producto?.costo_referencia ?? '0',
    precio_venta: producto?.precio_venta ?? '0',
    stock_minimo: producto?.stock_minimo ?? '0',
  });
  const [tocado, setTocado] = useState(false);

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  const errores = {};
  if (!esEdicion && !valores.sku.trim()) errores.sku = 'Este campo es obligatorio.';
  if (!valores.nombre.trim()) errores.nombre = 'Este campo es obligatorio.';
  for (const campo of ['costo_referencia', 'precio_venta', 'stock_minimo']) {
    if (!isNonNegative(valores[campo])) errores[campo] = 'Debe ser un número mayor o igual a 0.';
  }

  const hayErrores = Object.keys(errores).length > 0;
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function errorDe(campo) {
    if (tocado && errores[campo]) return errores[campo];
    return campoDeError(error) === campo ? mensajeDeError(error) : '';
  }

  function enviar(evento) {
    evento?.preventDefault();
    if (hayErrores || enviando) {
      setTocado(true);
      return;
    }

    const datos = {
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim() || null,
      costo_referencia: valores.costo_referencia,
      precio_venta: valores.precio_venta,
      stock_minimo: valores.stock_minimo,
    };
    // El SKU solo viaja en el alta: el PATCH del backend no lo acepta.
    onGuardar(esEdicion ? datos : { ...datos, sku: valores.sku.trim() });
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${producto.sku}` : 'Nuevo producto'}
      onCerrar={onCerrar}
      pie={
        <div className="flex w-full items-center gap-2">
          {esEdicion && producto.activo ? (
            <button
              type="button"
              className="btn btn-peligro mr-auto"
              disabled={enviando}
              onClick={() => onDarDeBaja(producto)}
            >
              Dar de baja
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-secundario"
            disabled={enviando}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" disabled={enviando} onClick={enviar}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
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

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          etiqueta="SKU"
          paraId="sku"
          error={errorDe('sku')}
          ayuda={
            esEdicion
              ? 'El SKU no se puede cambiar: el kardex lo referencia.'
              : 'Único por empresa.'
          }
        >
          <input
            id="sku"
            className="campo-control font-mono"
            disabled={esEdicion}
            value={valores.sku}
            onChange={cambiar('sku')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <Campo etiqueta="Nombre" paraId="nombre" error={errorDe('nombre')}>
          <input
            id="nombre"
            className="campo-control"
            value={valores.nombre}
            onChange={cambiar('nombre')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <Campo etiqueta="Descripción" paraId="descripcion" error={errorDe('descripcion')}>
          <textarea
            id="descripcion"
            rows={2}
            className="campo-control"
            value={valores.descripcion}
            onChange={cambiar('descripcion')}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Costo de referencia" paraId="costo" error={errorDe('costo_referencia')}>
            <input
              id="costo"
              inputMode="decimal"
              className="campo-control"
              value={valores.costo_referencia}
              onChange={cambiar('costo_referencia')}
              onBlur={() => setTocado(true)}
            />
          </Campo>

          <Campo etiqueta="Precio de venta" paraId="precio" error={errorDe('precio_venta')}>
            <input
              id="precio"
              inputMode="decimal"
              className="campo-control"
              value={valores.precio_venta}
              onChange={cambiar('precio_venta')}
              onBlur={() => setTocado(true)}
            />
          </Campo>
        </div>

        <Campo
          etiqueta="Stock mínimo"
          paraId="minimo"
          error={errorDe('stock_minimo')}
          ayuda="Cuando la existencia baje de aquí, se disparará una alerta."
        >
          <input
            id="minimo"
            inputMode="decimal"
            className="campo-control"
            value={valores.stock_minimo}
            onChange={cambiar('stock_minimo')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
