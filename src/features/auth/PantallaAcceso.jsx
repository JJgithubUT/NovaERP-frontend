export function PantallaAcceso({ titulo, subtitulo, children, pie }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-5">
      <div className="halo halo-guinda" aria-hidden="true" />
      <div className="halo halo-negro" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="tarjeta-acceso sombra-tarjeta rounded-lg border border-outline-variant bg-surface px-8 py-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="sombra-guinda flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-action text-[22px] font-bold text-on-action">
              N
            </div>
            <div>
              <h1 className="text-[24px] font-extrabold leading-none tracking-[-0.5px] text-action">
                novaERP
              </h1>
              <p className="mt-1 text-[12px] font-semibold text-gris-medio">Sistema de Gestión</p>
            </div>
          </div>

          <h2 className="text-[28px] font-extrabold tracking-[-0.5px] text-on-surface">{titulo}</h2>
          <p className="mb-7 mt-1.5 text-body-md leading-snug text-gris-medio">{subtitulo}</p>

          {children}
        </div>

        {pie ? <div className="mt-6 text-center text-label-md">{pie}</div> : null}
      </div>
    </main>
  );
}
/**
 * Banda de error de las pantallas públicas. `role="alert"` para que un lector
 * de pantalla lo anuncie: si no, el usuario ciego reenvía el formulario sin
 * enterarse de por qué falló.
 */
export function AvisoError({ mensaje }) {
  return (
    <p
      role="alert"
      className="mb-5 rounded-DEFAULT border border-action bg-background px-3.5 py-3 text-center text-body-sm font-semibold text-action"
    >
      {mensaje}
    </p>
  );
}
