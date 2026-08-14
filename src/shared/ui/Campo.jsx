/**
 * Envoltorio de un control de formulario: etiqueta, ayuda y error.
 *
 * El error va **debajo del campo que falló**, no en un banner arriba. Es la
 * diferencia entre "algo salió mal" y "el RFC ya existe": el backend manda
 * `campo` en sus 422 justamente para poder señalar el control exacto, y
 * desaprovecharlo obliga al usuario a adivinar cuál de seis campos corregir.
 *
 * @param {{
 *   etiqueta: string,
 *   paraId: string,
 *   error?: string,
 *   ayuda?: string,
 *   children: React.ReactNode,
 * }} props
 */
export function Campo({ etiqueta, paraId, error = '', ayuda = '', children }) {
  return (
    <div className="campo">
      <label className="campo-etiqueta" htmlFor={paraId}>
        {etiqueta}
      </label>

      {children}

      {ayuda && !error ? <p className="text-body-sm text-on-surface-variant">{ayuda}</p> : null}
      {error ? (
        <p className="campo-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
