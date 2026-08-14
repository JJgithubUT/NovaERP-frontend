import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';

/**
 * Alta y edición de proveedor.
 *
 * Dos diferencias con el formulario de cliente, y ninguna es cosmética:
 *
 * - El **RFC es obligatorio** aquí (`NOT NULL` en la base), mientras que en
 *   cliente es opcional.
 * - La baja es **incondicional**: a diferencia del cliente, el backend no
 *   comprueba si queda deuda pendiente. Las órdenes y cuentas por pagar del
 *   proveedor se conservan intactas, así que el aviso lo dice en vez de sugerir
 *   que se borra algo.
 *
 * @param {{
 *   proveedor?: object | null,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onGuardar: (datos: object) => void,
 *   onDarDeBaja: (proveedor: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function ProveedorFormModal({
  proveedor = null,
  enviando = false,
  error = null,
  onGuardar,
  onDarDeBaja,
  onCerrar,
}) {
  const esEdicion = proveedor !== null;

  const [valores, setValores] = useState({
    rfc_o_id_fiscal: proveedor?.rfc_o_id_fiscal ?? '',
    razon_social: proveedor?.razon_social ?? '',
    correo: proveedor?.correo ?? '',
    telefono: proveedor?.telefono ?? '',
  });
  const [tocado, setTocado] = useState(false);

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  const errores = {};
  if (!valores.rfc_o_id_fiscal.trim()) errores.rfc_o_id_fiscal = 'Este campo es obligatorio.';
  if (!valores.razon_social.trim()) errores.razon_social = 'Este campo es obligatorio.';
  const correo = valores.correo.trim();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'Correo no válido.';

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

    onGuardar({
      rfc_o_id_fiscal: valores.rfc_o_id_fiscal.trim(),
      razon_social: valores.razon_social.trim(),
      correo: valores.correo.trim() || null,
      telefono: valores.telefono.trim() || null,
    });
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar ${proveedor.razon_social}` : 'Nuevo proveedor'}
      onCerrar={onCerrar}
      pie={
        <div className="flex w-full items-center gap-2">
          {esEdicion && proveedor.activo ? (
            <button
              type="button"
              className="btn btn-peligro mr-auto"
              disabled={enviando}
              onClick={() => onDarDeBaja(proveedor)}
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
          etiqueta="RFC o id fiscal"
          paraId="rfc"
          error={errorDe('rfc_o_id_fiscal')}
          ayuda="Obligatorio para proveedores."
        >
          <input
            id="rfc"
            className="campo-control font-mono"
            value={valores.rfc_o_id_fiscal}
            onChange={cambiar('rfc_o_id_fiscal')}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <Campo etiqueta="Razón social" paraId="razon" error={errorDe('razon_social')}>
          <input
            id="razon"
            className="campo-control"
            value={valores.razon_social}
            onChange={cambiar('razon_social')}
            onBlur={() => setTocado(true)}
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

        {esEdicion && proveedor.activo ? (
          <p className="text-body-sm text-on-surface-variant">
            Dar de baja no comprueba deuda pendiente ni borra nada: sus órdenes y cuentas por pagar
            se conservan, pero dejará de ofrecerse al crear órdenes nuevas.
          </p>
        ) : null}

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
