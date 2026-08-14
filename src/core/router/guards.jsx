import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { usePlataforma } from '../plataforma/usePlataforma';
import { RUTA_ACCESO_PLATAFORMA, RUTA_ORGANIZACIONES } from '../plataforma/rutas';
/**
 * Exige sesión válida. Guarda a dónde iba el usuario para devolverlo ahí
 * después de entrar.
 */
export function RequiereSesion({ children }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.isAuthenticated()) return <>{children}</>;
  const intento = location.pathname + location.search;
  const destino = intento === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(intento)}`;
  return <Navigate to={destino} replace />;
}
/** Impide volver al login con sesión abierta. */
export function SoloInvitado({ children }) {
  const auth = useAuth();
  if (!auth.isAuthenticated()) return <>{children}</>;
  return <Navigate to={`/${auth.tenantSlug()}`} replace />;
}
/**
 * Aislamiento de tenant en el enrutador (Flujo 2).
 *
 * Las rutas de la app van prefijadas con el slug del tenant
 * (`/acme/inventario/productos`). Este guard compara el slug de la URL con el
 * del JWT y, si no coinciden, corta ahí mismo.
 *
 * El punto no es la seguridad —el backend ya filtra por el `tenant_slug` del
 * token y responde 404 pase lo que pase—; es no mandar una petición que sabemos
 * de antemano que va a fallar, y no dejar al usuario mirando una pantalla a
 * medio cargar mientras lo descubre.
 *
 * Responde 404 y no 403, igual que el backend: confirmar que el tenant existe
 * ya sería filtrar información entre tenants.
 */
export function RequiereTenant({ children }) {
  const auth = useAuth();
  const { tenant } = useParams();
  if (tenant && auth.tenantSlug() && tenant === auth.tenantSlug()) return <>{children}</>;
  return <Navigate to="/404" replace />;
}
/**
 * Exige que el módulo esté habilitado para el tenant.
 *
 * Los módulos vienen de `/api/core/me/` y son los mismos que arman el sidebar.
 * Esto es lo que impide que alguien llegue a `/acme/inventario/productos`
 * escribiendo la URL cuando su tenant no contrató Inventario.
 */
export function RequiereModulo({ codigo, children }) {
  const auth = useAuth();
  /*
   * Mientras `me` no haya llegado no se puede decidir: en un arranque en frío
   * sin caché, `modulos` está vacío y rebotaríamos al 404 una ruta perfectamente
   * válida. Se deja pasar y es el 401/403 del backend quien corrige.
   */
  if (auth.me() === null) return <>{children}</>;
  if (auth.hasModulo(codigo)) return <>{children}</>;
  return <Navigate to="/404" replace />;
}
/**
 * Exige uno o más permisos concretos.
 *
 * Ojo con un detalle real del backend: `permisos` puede llegar **vacío** aunque
 * el usuario tenga roles, si `rol_permiso` no está poblado todavía para ese rol.
 * Mientras el seed de permisos no esté completo, esto dejaría a todo el mundo
 * fuera; por eso las rutas usan `RequiereModulo` y este queda listo para cuando
 * el backend pueble la tabla.
 */
export function RequierePermiso({ codigos, children }) {
  const auth = useAuth();
  if (auth.me() === null) return <>{children}</>;
  if (auth.hasAnyPermiso(codigos)) return <>{children}</>;
  return <Navigate to="/403" replace />;
}
/* -------------------------------------------------------------- plataforma */
/**
 * Exige sesión de plataforma. Es una comprobación local sobre el `exp` del
 * token: el backend sigue siendo la autoridad, y una sesión revocada solo se
 * cae en el primer 401 — que el interceptor convierte en logout. Esto evita el
 * parpadeo del portal cuando no hay token en absoluto, que es el caso común.
 */
export function RequiereSesionPlataforma({ children }) {
  const plataforma = usePlataforma();
  if (plataforma.autenticado()) return <>{children}</>;
  return <Navigate to={RUTA_ACCESO_PLATAFORMA} replace />;
}
/** Impide volver a la pantalla de acceso con sesión de plataforma abierta. */
export function SoloInvitadoPlataforma({ children }) {
  const plataforma = usePlataforma();
  if (!plataforma.autenticado()) return <>{children}</>;
  return <Navigate to={RUTA_ORGANIZACIONES} replace />;
}
