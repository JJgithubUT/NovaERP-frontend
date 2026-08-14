import { NavLink, Outlet } from 'react-router-dom';
import { useTenantSlug } from '../../../core/auth/useAuth';

/** RV-01..06, en el orden en que los numera el backend. */
const PESTANAS = [
  { segmento: 'periodo', label: 'Por periodo' },
  { segmento: 'clientes', label: 'Clientes' },
  { segmento: 'productos', label: 'Productos' },
  { segmento: 'embudo', label: 'Embudo' },
  { segmento: 'cartera', label: 'Cartera' },
  { segmento: 'vendedores', label: 'Vendedores' },
];

/**
 * Segundo nivel de pestañas, dentro de la de Reportes.
 *
 * Se anidan en vez de colgar los seis reportes del menú principal de Ventas
 * porque ahí ya hay seis secciones operativas: doce pestañas en una sola fila
 * dejarían de leerse como un menú.
 *
 * Se distinguen del primer nivel a propósito — píldoras en vez de subrayado —
 * para que no parezcan la misma barra partida en dos.
 */
export function ReportesLayout() {
  const tenantSlug = useTenantSlug();

  return (
    <div className="flex flex-col gap-5">
      <nav
        aria-label="Reportes de Ventas"
        className="flex flex-wrap gap-1.5 rounded-DEFAULT bg-surface-container p-1.5"
      >
        {PESTANAS.map((pestana) => (
          <NavLink
            key={pestana.segmento}
            to={`/${tenantSlug}/ventas/reportes/${pestana.segmento}`}
            className={({ isActive }) =>
              [
                'rounded-sm px-3 py-1.5 text-body-sm font-medium transition-colors',
                isActive
                  ? 'bg-action text-on-action shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface hover:text-on-surface',
              ].join(' ')
            }
          >
            {pestana.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
