import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { EntityCombo } from '../../../shared/ui/EntityCombo';
import { Modal } from '../../../shared/ui/Modal';
import { isNonNegative } from '../../../shared/utils/decimal.util';
import { hoyIso } from '../../../shared/utils/fecha.util';

/**
 * Alta y edición de oportunidad.
 *
 * Al editar, el cliente se muestra pero no se puede cambiar: el PATCH del
 * backend no acepta `cliente_id` y mandarlo devuelve un 400. Una oportunidad
 * que cambia de cliente es otra oportunidad.
 *
 * La fecha de cierre estimada no puede ser anterior a hoy (RF-30). El `min` del
 * input lo impide en el navegador, pero el backend lo revalida igual.
 *
 * @param {{
 *   oportunidad?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function OportunidadFormModal({
  oportunidad = null,
  enviando = false,
  error = null,
  onGuardar,
  onCerrar,
}) {
  const esEdicion = oportunidad !== null;

  const [cliente, setCliente] = useState(/** @type {object | null} */ (null));
  const [nombre, setNombre] = useState(oportunidad?.nombre ?? '');
  const [valor, setValor] = useState(oportunidad?.valor_estimado ?? '0');
  const [fecha, setFecha] = useState(oportunidad?.fecha_cierre_estimada ?? hoyIso());
  const [tocado, setTocado] = useState(false);

  const errores = {};
  if (!nombre.trim()) errores.nombre = 'Este campo es obligatorio.';
  if (!isNonNegative(valor)) errores.valor_estimado = 'Debe ser un número mayor o igual a 0.';
  if (!esEdicion && !cliente) errores.cliente_id = 'Elige un cliente.';
  if (!fecha) errores.fecha_cierre_estimada = 'Indica una fecha.';

  const hayErrores = Object.keys(errores).length > 0;
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  /** @param {string} campo */
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
      nombre: nombre.trim(),
      valor_estimado: valor,
      fecha_cierre_estimada: fecha,
    };
    // `cliente_id` solo en el alta: ver la nota de arriba.
    onGuardar(esEdicion ? datos : { ...datos, cliente_id: cliente.id });
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${oportunidad.nombre}` : 'Nueva oportunidad'}
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
          <button type="button" className="btn btn-primario" disabled={enviando} onClick={enviar}>
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

      <form onSubmit={enviar} className="flex flex-col gap-4">
        {esEdicion ? null : (
          <EntityCombo
            etiqueta="Cliente"
            tipo="cliente"
            valor={cliente}
            onValor={setCliente}
            marcador="Buscar por razón social…"
            error={errorDe('cliente_id')}
          />
        )}

        <Campo etiqueta="Nombre de la oportunidad" paraId="nombre" error={errorDe('nombre')}>
          <input
            id="nombre"
            className="campo-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Valor estimado" paraId="valor" error={errorDe('valor_estimado')}>
            <input
              id="valor"
              inputMode="decimal"
              className="campo-control"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onBlur={() => setTocado(true)}
            />
          </Campo>

          <Campo etiqueta="Cierre estimado" paraId="fecha" error={errorDe('fecha_cierre_estimada')}>
            <input
              id="fecha"
              type="date"
              min={hoyIso()}
              className="campo-control"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              onBlur={() => setTocado(true)}
            />
          </Campo>
        </div>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
