import { useState } from 'react';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { Campo } from '../../shared/ui/Campo';
import { Modal } from '../../shared/ui/Modal';
import { TIPOS_SUSPENSION } from './plataforma.labels';

/**
 * Suspensión o baja lógica de una organización.
 *
 * Son el **mismo endpoint** — lo que cambia es el flag `baja` en la query — y
 * por eso comparten modal. La diferencia práctica que el texto explica: ambas
 * cierran todas las sesiones al instante y ninguna borra nada; la baja es la
 * salida definitiva del servicio y la suspensión, una pausa.
 *
 * El motivo es obligatorio y queda registrado: es lo que verá quien pregunte
 * más adelante por qué esta organización dejó de funcionar.
 *
 * @param {{
 *   organizacion: object,
 *   baja?: boolean,
 *   enviando?: boolean,
 *   error?: unknown,
 *   onConfirmar: (datos: object) => void,
 *   onCerrar: () => void,
 * }} props
 */
export function SuspenderModal({
  organizacion,
  baja = false,
  enviando = false,
  error = null,
  onConfirmar,
  onCerrar,
}) {
  const [tipo, setTipo] = useState('administrativa');
  const [motivo, setMotivo] = useState('');

  const valido = motivo.trim().length >= 3;
  const errorGeneral = !error || campoDeError(error) ? null : mensajeDeError(error);
  const ayudaTipo = TIPOS_SUSPENSION.find((t) => t.valor === tipo)?.ayuda ?? '';

  function enviar() {
    if (!valido || enviando) return;
    onConfirmar({ tipo, motivo: motivo.trim() });
  }

  return (
    <Modal
      titulo={`${baja ? 'Dar de baja' : 'Suspender'} ${organizacion.razon_social}`}
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
            className="btn btn-peligro"
            disabled={enviando || !valido}
            onClick={enviar}
          >
            {enviando ? 'Procesando…' : baja ? 'Dar de baja' : 'Suspender'}
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

      <p className="rounded-DEFAULT border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
        Se cerrarán <strong>todas</strong> las sesiones de la organización al instante y sus
        usuarios dejarán de poder entrar.{' '}
        {baja
          ? 'La baja es lógica: no se borra nada y se puede reactivar.'
          : 'La suspensión es reversible en cualquier momento.'}
      </p>

      <Campo etiqueta="Tipo" paraId="tipo" ayuda={ayudaTipo}>
        <select
          id="tipo"
          className="campo-control"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {TIPOS_SUSPENSION.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        etiqueta="Motivo"
        paraId="motivo"
        error={campoDeError(error) === 'motivo' ? mensajeDeError(error) : ''}
        ayuda="Queda registrado. Será lo que explique más adelante por qué se detuvo el servicio."
      >
        <textarea
          id="motivo"
          rows={3}
          className="campo-control"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </Campo>
    </Modal>
  );
}
