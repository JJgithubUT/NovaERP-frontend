import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import * as auth from '../core/auth/auth.service';
import { useAuth } from '../core/auth/useAuth';
import { ToastHost } from '../shared/ui/ToastHost';
import { ActualizacionPrompt } from './ActualizacionPrompt';
import { OfflineBanner } from './OfflineBanner';
import { construirNavegacion, construirNavegacionSistema, itemInicio } from './navigation';
/**
 * El "Application Shell": la estructura que el Service Worker sirve al instante
 * desde caché, antes de que exista una sola respuesta del backend.
 *
 * Por eso el shell no pide datos: se pinta con lo que ya hay en el store (el
 * `me` cacheado en localStorage). El contenido de cada módulo llega después,
 * por su cuenta.
 *
 * La apariencia es la del `App.jsx` de `main` —sidebar blanco, píldora Guinda
 * en el ítem activo, botón flotante de plegado, tarjeta de usuario abajo— y lo
 * que cambia es de dónde salen los datos: el menú ya no es una lista fija de
 * cinco entradas, sino la intersección de los módulos que el tenant tiene
 * contratados con los que la app sabe pintar.
 */
export function ShellLayout() {
  const store = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [plegado, setPlegado] = useState(false);
  const tenantSlug = store.tenantSlug();
  const usuario = store.usuario();
  const tenant = store.tenant();
  const inicio = itemInicio(tenantSlug);
  const navegacion = construirNavegacion(store.modulos(), tenantSlug);
  const navegacionSistema = construirNavegacionSistema(
    tenantSlug,
    store.hasPermiso('core:usuarios:leer'),
  );
  /** Compacto solo si está plegado y el drawer móvil no está abierto. */
  const compacto = plegado && !menuAbierto;
  const iniciales = calcularIniciales(usuario?.nombre_completo);
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-on-surface md:flex-row">
      {/* Navbar superior, solo en móvil. */}
      <div className="z-30 flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface p-4 shadow-sm md:hidden">
        <div>
          <h1 className="text-xl font-bold text-action">novaERP</h1>
          <p className="text-[10px] font-medium text-on-surface-variant">
            {tenant?.razon_social ?? 'Sistema de Gestión'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          className="p-2 text-on-surface-variant hover:text-action"
        >
          {menuAbierto ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuAbierto ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col justify-between overflow-visible',
          'border-r border-outline-variant bg-surface p-3 shadow-sm transition-all duration-300 ease-in-out md:static',
          menuAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          compacto ? 'md:w-20' : 'md:w-64',
        ].join(' ')}
      >
        {/* Botón flotante para plegar. */}
        <button
          type="button"
          onClick={() => setPlegado(!plegado)}
          title={compacto ? 'Expandir menú' : 'Plegar menú'}
          className="absolute -right-3.5 top-7 z-50 hidden rounded-full bg-action p-1 text-on-action shadow-md transition-transform hover:bg-action-hover active:scale-95 md:flex"
        >
          {compacto ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="space-y-4">
          <div className="hidden h-10 items-center gap-3 px-1 md:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-action text-base font-bold text-on-action">
              N
            </div>
            {!compacto ? (
              <div className="min-w-0 whitespace-nowrap">
                <h1 className="text-xl font-extrabold leading-none tracking-tight text-action">
                  novaERP
                </h1>
                <p className="truncate text-[10px] font-medium text-on-surface-variant">
                  {tenant?.razon_social ?? 'Sistema de Gestión'}
                </p>
              </div>
            ) : null}
          </div>

          <nav className="space-y-1">
            {inicio ? (
              <EnlaceNav
                item={inicio}
                compacto={compacto}
                alNavegar={() => setMenuAbierto(false)}
                fin
              />
            ) : null}

            {navegacion.map((item) => (
              <EnlaceNav
                key={item.codigo}
                item={item}
                compacto={compacto}
                alNavegar={() => setMenuAbierto(false)}
              />
            ))}

            {navegacion.length === 0 && store.me() !== null ? (
              <p className="px-3.5 py-2 text-label-md text-on-surface-variant">
                {compacto ? '—' : 'Sin módulos habilitados.'}
              </p>
            ) : null}

            <hr className="!my-3 border-outline-variant" />

            {navegacionSistema.map((item) => (
              <EnlaceNav
                key={item.codigo}
                item={item}
                compacto={compacto}
                alNavegar={() => setMenuAbierto(false)}
              />
            ))}
          </nav>
        </div>

        {/* Bloque inferior fijo: identidad y salida. */}
        <div className="mt-auto space-y-2 border-t border-outline-variant px-1 pb-1 pt-3">
          <div
            className={[
              'flex items-center gap-2.5 rounded-md border border-outline-variant bg-surface-container px-2 py-1.5',
              compacto ? 'justify-center p-2' : '',
            ].join(' ')}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action/10 text-xs font-bold text-action">
              {iniciales}
            </div>
            {!compacto ? (
              <div className="overflow-hidden whitespace-nowrap">
                <p className="truncate text-xs font-semibold text-on-surface">
                  {usuario?.nombre_completo ?? 'Usuario'}
                </p>
                <p className="truncate text-[10px] text-on-surface-variant">
                  {usuario?.correo ?? '—'}
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void auth.logout()}
            title={compacto ? 'Cerrar Sesión' : ''}
            className={[
              'flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error-container',
              compacto ? 'justify-center px-0' : '',
            ].join(' ')}
          >
            <LogOut size={16} className="shrink-0" />
            {!compacto ? <span className="whitespace-nowrap">Cerrar Sesión</span> : null}
          </button>
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Fuera del <main>: los avisos de conexión y de versión nueva no deben
            desplazarse con el contenido. */}
        <ActualizacionPrompt />
        <OfflineBanner />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Fuera del <main>: los avisos van fijos a la ventana, y dentro de un
          contenedor con scroll se desplazarían con la tabla. */}
      <ToastHost />
    </div>
  );
}
function EnlaceNav({ item, compacto, alNavegar, fin = false }) {
  const Icono = item.icon;
  return (
    <NavLink
      to={item.link}
      end={fin}
      onClick={alNavegar}
      title={compacto ? item.label : ''}
      className={({ isActive }) =>
        [
          'group flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-action text-on-action shadow-md'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
          compacto ? 'justify-center md:px-0' : '',
        ].join(' ')
      }
    >
      <Icono size={20} className="shrink-0" />
      {!compacto ? <span className="whitespace-nowrap">{item.label}</span> : null}
    </NavLink>
  );
}
/**
 * Iniciales del avatar. `main` las calculaba cortando los dos primeros
 * caracteres del nombre ("Ju" para "Juan Pérez"); tomar la inicial de nombre y
 * apellido es lo que se espera de un avatar y no cuesta más.
 */
function calcularIniciales(nombre) {
  if (!nombre) return '—';
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '—';
  const primera = palabras[0]?.[0] ?? '';
  const segunda = palabras.length > 1 ? (palabras[palabras.length - 1]?.[0] ?? '') : '';
  return (primera + segunda).toUpperCase();
}
