import { createBrowserRouter, Navigate } from 'react-router-dom';
import { authStore } from '../core/auth/auth.store';
import { registrarNavegador } from '../core/router/navegacion';
import {
  RequiereModulo,
  RequiereSesion,
  RequiereTenant,
  SoloInvitado,
} from '../core/router/guards';
import { ShellLayout } from '../layout/ShellLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { RecuperarPage } from '../features/auth/RecuperarPage';
import { RestablecerPage } from '../features/auth/RestablecerPage';
import { ForbiddenPage, NotFoundPage, SeccionNoEncontrada } from '../features/errors/ErrorPages';
import { PendientePage } from '../features/PendientePage';
// Pantallas de la maqueta de `main`, todavía con datos simulados. Se sustituyen
// módulo a módulo conforme se conectan al API real; ver `PendientePage`.
import Dashboard from '../pages/Dashboard.jsx';
import Ventas from '../pages/Ventas.jsx';
import Inventario from '../pages/Inventario.jsx';
import Compras from '../pages/Compras.jsx';
/**
 * Todas las rutas de la app cuelgan de `/:tenant`. No es cosmético: hace que el
 * tenant sea explícito en cada URL, que los enlaces compartidos sean
 * inequívocos, y le da al guard de tenant algo concreto contra qué validar
 * (Flujo 2).
 *
 * Es el cambio de fondo frente a `main`, que navegaba con un `useState` de
 * pestañas: allí no había URLs, así que no había enlaces que compartir, ni
 * botón de atrás, ni forma de que un guard interviniera antes de pintar.
 */
/** Manda la raíz al tenant del token, o al login si no hay sesión. */
function RedirigirRaiz() {
  const slug = authStore.tenantSlug();
  const destino = authStore.isAuthenticated() && slug ? `/${slug}` : '/login';
  return <Navigate to={destino} replace />;
}
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RedirigirRaiz />,
  },
  {
    path: '/login',
    element: (
      <SoloInvitado>
        <LoginPage />
      </SoloInvitado>
    ),
  },
  /*
   * Públicas y **sin** el guard de invitado: quien recupera su contraseña puede
   * estar en un navegador con la sesión de otra persona abierta, y mandarlo a
   * su tenant le impediría recuperar la cuenta.
   */
  { path: '/recuperar', element: <RecuperarPage /> },
  { path: '/restablecer', element: <RestablecerPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '/404', element: <NotFoundPage /> },
  {
    path: '/:tenant',
    element: (
      <RequiereSesion>
        <RequiereTenant>
          <ShellLayout />
        </RequiereTenant>
      </RequiereSesion>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'ventas',
        element: (
          <RequiereModulo codigo="VENTAS">
            <Ventas />
          </RequiereModulo>
        ),
      },
      {
        path: 'inventario',
        element: (
          <RequiereModulo codigo="INVENTARIO">
            <Inventario />
          </RequiereModulo>
        ),
      },
      {
        path: 'compras',
        element: (
          <RequiereModulo codigo="COMPRAS">
            <Compras />
          </RequiereModulo>
        ),
      },
      { path: 'cuenta', element: <PendientePage modulo="Mi cuenta" /> },
      { path: 'administracion', element: <PendientePage modulo="Administración" /> },
      // Sección inexistente bajo un tenant válido. Sin esto, el shell se
      // pintaría con el `<Outlet />` vacío en vez de decir que no existe.
      { path: '*', element: <SeccionNoEncontrada /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
/**
 * Deja el router al alcance de `navegarA`, que es como `logout()` y el
 * interceptor de 401 llevan al usuario al acceso sin ser componentes.
 */
registrarNavegador((ruta, opciones) => {
  void router.navigate(ruta, opciones);
});
