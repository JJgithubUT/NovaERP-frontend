import { NavLink, Outlet } from 'react-router-dom';
import { useTenantSlug } from '../../core/auth/useAuth';

/**
 * Las pestañas siguen el orden de la cadena comercial (FLUJO-VENTAS §1):
 * clientes, luego oportunidad → cotización → pedido → factura. Leerlas de
 * izquierda a derecha es leer el ciclo de venta.
 *
 * Frente a la maqueta de `main` hay una pestaña más, «Oportunidades»: allí el
 * pipeline y el listado eran la misma pantalla, pero son dos vistas distintas
 * del mismo dato — el kanban agregado por etapa y la tabla operable.
 */
const PESTANAS = [
  { segmento: 'clientes', label: 'Clientes' },
  { segmento: 'pipeline', label: 'Pipeline CRM' },
  { segmento: 'oportunidades', label: 'Oportunidades' },
  { segmento: 'cotizaciones', label: 'Cotizaciones' },
  { segmento: 'pedidos', label: 'Pedidos' },
  { segmento: 'facturas', label: 'Facturas' },
  { segmento: 'reportes', label: 'Reportes' },
];

/**
 * Encabezado y pestañas del módulo, con el aspecto que tenían en `main`:
 * cabecera pegada arriba al hacer scroll, pestañas subrayadas y el contenido en
 * una tarjeta blanca colgando de la barra.
 *
 * Una diferencia deliberada: `main` pintaba el subrayado activo en `#800000`,
 * distinto del `#73030D` de su propio sidebar. Aquí se usa el token de marca
 * para los dos, porque dos guindas a un centímetro de distancia se leen como un
 * error de la aplicación, no como una decisión.
 */
export function VentasLayout() {
  const tenantSlug = useTenantSlug();

  return (
    <section className="-m-4 flex min-h-full flex-col md:-m-8">
      <div className="sticky top-0 z-20 bg-background px-6 pt-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-on-surface">Módulo de Ventas</h1>
          <p className="text-body-md text-on-surface-variant">
            Ciclo comercial completo: oportunidad, cotización, pedido y factura.
          </p>
        </header>

        <nav
          aria-label="Secciones de Ventas"
          className="flex space-x-6 overflow-x-auto rounded-t-lg border-b border-outline-variant bg-surface px-4 shadow-sm"
        >
          {PESTANAS.map((pestana) => (
            <NavLink
              key={pestana.segmento}
              to={`/${tenantSlug}/ventas/${pestana.segmento}`}
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
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-b-lg border border-t-0 border-outline-variant bg-surface p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
