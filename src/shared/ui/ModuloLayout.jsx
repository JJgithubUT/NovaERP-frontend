import { NavLink, Outlet } from 'react-router-dom';
import { useTenantSlug } from '../../core/auth/useAuth';

/**
 * Cabecera y pestañas de un módulo (Ventas, Inventario, Compras…).
 *
 * Reproduce el aspecto que tenían estas pantallas en `main`: cabecera pegada
 * arriba al hacer scroll, pestañas subrayadas y el contenido en una tarjeta
 * blanca colgando de la barra.
 *
 * Las pestañas son **rutas hijas**, no estado local como en la maqueta. Eso da
 * URLs que se pueden compartir y marcar (`/acme/inventario/kardex`) y permite
 * volver con el botón Atrás — que en la versión de pestañas por `useState`
 * sacaba al usuario del módulo entero.
 *
 * Una diferencia deliberada con `main`: allí el subrayado activo era `#800000`,
 * distinto del `#73030D` de su propio sidebar. Aquí se usa el token de marca
 * para los dos, porque dos guindas a un centímetro se leen como un error de la
 * aplicación, no como una decisión.
 *
 * @param {{
 *   titulo: string,
 *   descripcion: string,
 *   base: string,
 *   pestanas: readonly {segmento: string, label: string}[],
 * }} props
 */
export function ModuloLayout({ titulo, descripcion, base, pestanas }) {
  const tenantSlug = useTenantSlug();

  return (
    <section className="-m-4 flex flex-col md:-m-8">
      <div className="sticky top-0 z-20 bg-background px-6 pt-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-on-surface">{titulo}</h1>
          <p className="text-body-md text-on-surface-variant">{descripcion}</p>
        </header>

        <nav
          aria-label={`Secciones de ${titulo}`}
          className="flex space-x-6 overflow-x-auto rounded-t-lg border-b border-outline-variant bg-surface px-4 shadow-sm"
        >
          {pestanas.map((pestana) => (
            <NavLink
              key={pestana.segmento}
              to={`/${tenantSlug}/${base}/${pestana.segmento}`}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap border-b-2 px-2 py-4 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-action font-semibold text-action'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface',
                ].join(' ')
              }
            >
              {pestana.label}
            </NavLink>
          ))}
        </nav>

        {/*
         * Franja blanca bajo las pestañas. Va DENTRO de la cabecera sticky para
         * que, al hacer scroll, el contenido de la pestaña desaparezca debajo de
         * ella y nunca quede pegado (o encimado) a la línea de las pestañas.
         */}
        <div aria-hidden="true" className="h-4 border-x border-outline-variant bg-surface" />
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-b-lg border border-t-0 border-outline-variant bg-surface p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </section>
  );
}