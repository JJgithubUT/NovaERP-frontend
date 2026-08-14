import { useState } from 'react';
import { isApiError } from '../../../core/errors/api-error.model';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';
import { formatMoneda, isNonNegative } from '../../../shared/utils/decimal.util';

/**
 * Alta y edición de cliente.
 *
 * El detalle propio de esta pantalla es la baja: el backend la rechaza con 422
 * si el cliente tiene saldo vivo en cuentas por cobrar, y manda cuánto en
 * `saldo_pendiente`. Ese número se muestra formateado, porque "no se puede dar
 * de baja" sin decir cuánto debe obliga al usuario a irse a buscarlo a otra
 * pantalla.
 *
 * @param {{
 *   cliente?: import('../../../api/models/cliente.model.js').Cliente | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onDarDeBaja: (cliente: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function ClienteFormModal({
  cliente = null,
  enviando = false,
  error = null,
  onGuardar,
  onDarDeBaja,
  onCerrar,
}) {
  /*
   * El estado arranca del cliente en edición. No hace falta un efecto que lo
   * resincronice: el modal se monta y se desmonta con cada apertura, así que
   * este valor inicial siempre corresponde a la fila que se acaba de pulsar.
   */
  const [valores, setValores] = useState({
    razon_social: cliente?.razon_social ?? '',
    rfc_o_id_fiscal: cliente?.rfc_o_id_fiscal ?? '',
    correo: cliente?.correo ?? '',
    telefono: cliente?.telefono ?? '',
    limite_credito: cliente?.limite_credito ?? '0',
  });
  const [tocado, setTocado] = useState(false);

  /** @param {string} campo */
  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  const errores = validar(valores);
  const hayErrores = Object.keys(errores).length > 0;

  /**
   * Banner general. Si el 422 vino con `saldo_pendiente` (la guarda de la
   * baja), se añade el importe: el mensaje solo dice que no se puede, no cuánto
   * falta por cobrar.
   */
  const errorGeneral = (() => {
    if (!error || campoDeError(error)) return null;

    const mensaje = mensajeDeError(error);
    const saldo = isApiError(error) ? error.extra['saldo_pendiente'] : undefined;

    return typeof saldo === 'string'
      ? `${mensaje} Saldo pendiente: ${formatMoneda(saldo)}.`
      : mensaje;
  })();

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

    onGuardar({
      razon_social: valores.razon_social.trim(),
      // Los opcionales van como `null` y no como `''`: el backend distingue
      // "sin dato" de "cadena vacía" al comprobar la unicidad del RFC.
      rfc_o_id_fiscal: valores.rfc_o_id_fiscal.trim() || null,
      correo: valores.correo.trim() || null,
      telefono: valores.telefono.trim() || null,
      limite_credito: valores.limite_credito,
    });
  }

  return (
    <Modal
      titulo={cliente ? `Editar ${cliente.razon_social}` : 'Nuevo cliente'}
      onCerrar={onCerrar}
      pie={
        <div className="flex w-full items-center gap-2">
          {cliente ? (
            <button
              type="button"
              className="btn btn-peligro mr-auto"
              disabled={enviando}
              onClick={() => onDarDeBaja(cliente)}
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
        <Campo etiqueta="Razón social" paraId="razon" error={errorDe('razon_social')}>
          <input
            id="razon"
            className="campo-control"
            value={valores.razon_social}
            onChange={cambiar('razon_social')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <Campo
          etiqueta="RFC o id fiscal"
          paraId="rfc"
          error={errorDe('rfc_o_id_fiscal')}
          ayuda="Opcional, pero único por empresa si se informa."
        >
          <input
            id="rfc"
            className="campo-control font-mono"
            value={valores.rfc_o_id_fiscal}
            onChange={cambiar('rfc_o_id_fiscal')}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Correo" paraId="correo" error={errorDe('correo')}>
            <input
              id="correo"
              type="email"
              className="campo-control"
              value={valores.correo}
              onChange={cambiar('correo')}
              onBlur={() => setTocado(true)}
            />
          </Campo>

          <Campo etiqueta="Teléfono" paraId="telefono" error={errorDe('telefono')}>
            <input
              id="telefono"
              className="campo-control"
              value={valores.telefono}
              onChange={cambiar('telefono')}
            />
          </Campo>
        </div>

        <Campo
          etiqueta="Límite de crédito"
          paraId="limite"
          error={errorDe('limite_credito')}
          ayuda="Confirmar un pedido que lo supere exige autorización de crédito."
        >
          <input
            id="limite"
            inputMode="decimal"
            className="campo-control"
            value={valores.limite_credito}
            onChange={cambiar('limite_credito')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        {/* Deja que Enter envíe el formulario sin duplicar el botón del pie. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

/** @param {Record<string, string>} valores */
function validar(valores) {
  /** @type {Record<string, string>} */
  const errores = {};

  if (!valores.razon_social.trim()) errores.razon_social = 'Este campo es obligatorio.';

  const correo = valores.correo.trim();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'Correo no válido.';

  if (!isNonNegative(valores.limite_credito)) {
    errores.limite_credito = 'Debe ser un número mayor o igual a 0.';
  }

  return errores;
}
