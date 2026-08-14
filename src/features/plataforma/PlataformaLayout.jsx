import { Outlet } from 'react-router-dom';
import { Building2, LogOut, ShieldAlert } from 'lucide-react';
import { salir } from '../../core/plataforma/plataforma.service';
import { usePlataforma } from '../../core/plataforma/usePlataforma';
import { ToastHost } from '../../shared/ui/ToastHost';
import { formatFechaHora } from '../../shared/utils/fecha.util';

/**
 * Shell del portal de plataforma.
 *
 * Es **otra aplicación**, no una sección más del ERP, y por eso no reutiliza el
 * `ShellLayout` del tenant: no hay sidebar de módulos, no hay tenant en la URL,
 * y la sesión es otra. La banda guinda de arriba es deliberada — quien
 * administra las organizaciones tiene que saber en todo momento que no está en
 * la aplicación de un cliente.
 */
export function PlataformaLayout() {
  const plataforma = usePlataforma();
  const correo = plataforma.correo();
  const expira = plataforma.expiraEn();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-outline-variant bg-action text-on-action">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-on-action/15 font-bold">
              N
            </div>
            <div>
              <p className="text-body-md font-bold leading-none">novaERP · Plataforma</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] opacity-80">
                <ShieldAlert size={12} />
                Consola de administración global
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-body-sm font-semibold leading-none">{correo ?? '—'}</p>
              {expira ? (
                <p className="mt-1 text-[11px] opacity-80">
                  Sesión hasta {formatFechaHora(expira)}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void salir()}
              className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-body-sm font-medium transition-colors hover:bg-on-action/15"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Secciones del portal"
        className="border-b border-outline-variant bg-surface px-6"
      >
        <div className="mx-auto flex max-w-7xl gap-6">
          {/* Una sola sección por ahora: el portal solo administra tenants. Se
              deja la barra para que añadir la siguiente no cambie el layout. */}
          <span className="flex items-center gap-1.5 border-b-2 border-action px-2 py-3 text-sm font-semibold text-action">
            <Building2 size={16} />
            Organizaciones
          </span>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 p-6">
        <Outlet />
      </main>

      <ToastHost />
    </div>
  );
}
