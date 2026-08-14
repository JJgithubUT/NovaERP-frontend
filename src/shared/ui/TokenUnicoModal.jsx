import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Modal } from './Modal';

/**
 * Muestra el token de activación o de verificación de correo.
 *
 * El backend lo devuelve **una sola vez**, en la respuesta de crear el usuario
 * o de cambiarle el correo. No hay endpoint para volver a consultarlo: si esta
 * ventana se cierra sin copiarlo, la única salida es cambiar el correo otra vez
 * para forzar uno nuevo. Por eso el aviso es explícito y el botón de cerrar
 * dice «Ya lo copié» en vez de un «Cerrar» que invita a descartarlo sin leer.
 *
 * @param {{
 *   titulo: string,
 *   mensaje: string,
 *   destinatario: string,
 *   token: string,
 *   onCerrar: () => void,
 * }} props
 */
export function TokenUnicoModal({ titulo, mensaje, destinatario, token, onCerrar }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(token);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles (o contexto no seguro) el token sigue
      // visible y seleccionable a mano: no hay nada que reportar.
    }
  }

  return (
    <Modal
      titulo={titulo}
      onCerrar={onCerrar}
      pie={
        <button type="button" className="btn btn-primario" onClick={onCerrar}>
          Ya lo copié
        </button>
      }
    >
      <p className="text-body-md text-on-surface">{mensaje}</p>

      <p className="text-body-sm text-on-surface-variant">
        Destinatario: <strong className="text-on-surface">{destinatario}</strong>
      </p>

      <div className="flex items-center gap-2 rounded-DEFAULT border border-outline bg-background p-3">
        <code className="min-w-0 flex-1 break-all font-mono text-body-sm font-bold text-action">
          {token}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="btn-fila shrink-0"
          aria-label="Copiar código"
        >
          {copiado ? <Check size={14} /> : <Copy size={14} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <p className="rounded-DEFAULT border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
        Este código se muestra <strong>una sola vez</strong>. No se puede volver a consultar: si lo
        pierdes, tendrás que generar uno nuevo.
      </p>
    </Modal>
  );
}
