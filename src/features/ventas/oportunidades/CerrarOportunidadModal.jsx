import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { Campo } from '../../../shared/ui/Campo';
import { Modal } from '../../../shared/ui/Modal';
import { MOTIVOS_PERDIDA } from '../ventas.labels';

/**
 * Cierre de una oportunidad.
 *
 * El motivo solo se pide cuando se pierde: el backend lo exige ahí y lo ignora
 * en una ganada. Mostrar el desplegable siempre invitaría a rellenar un campo
 * que no se va a enviar.
 *
 * @param {{
 *   oportunidad: object,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onConfirmar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function CerrarOportunidadModal({
  oportunidad,
  enviando = false,
  error = null,
  onConfirmar,
  onCerrar,
}) {
  const [estado, setEstado] = useState('ganada');
  const [motivo, setMotivo] = useState('');

  const valido = estado === 'ganada' || motivo !== '';
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);

  function enviar() {
    if (!valido || enviando) return;
    onConfirmar(estado === 'perdida' ? { estado, motivo_perdida: motivo } : { estado });
  }

  return (
    <Modal
      titulo={`Cerrar ${oportunidad.nombre}`}
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
            {enviando ? 'Cerrando…' : 'Cerrar oportunidad'}
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

      <p className="text-body-sm text-on-surface-variant">
        El cierre es definitivo: una oportunidad cerrada no se puede reabrir.
      </p>

      <Campo etiqueta="Resultado" paraId="estado">
        <select
          id="estado"
          className="campo-control"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option value="ganada">Ganada</option>
          <option value="perdida">Perdida</option>
        </select>
      </Campo>

      {estado === 'perdida' ? (
        <Campo
          etiqueta="Motivo de la pérdida"
          paraId="motivo"
          error={campoDeError(error) === 'motivo_perdida' ? mensajeDeError(error) : ''}
        >
          <select
            id="motivo"
            className="campo-control"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          >
            <option value="">Selecciona un motivo…</option>
            {MOTIVOS_PERDIDA.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </Campo>
      ) : null}
    </Modal>
  );
}
