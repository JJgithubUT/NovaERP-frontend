import { createBrowserRouter, Navigate } from 'react-router-dom';
import { authStore } from '../core/auth/auth.store';
import { registrarNavegador } from '../core/router/navegacion';
import {
  RequiereModulo,
  RequierePermiso,
  RequiereSesion,
  RequiereSesionPlataforma,
  RequiereTenant,
  SoloInvitado,
  SoloInvitadoPlataforma,
} from '../core/router/guards';
import { ShellLayout } from '../layout/ShellLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { RecuperarPage } from '../features/auth/RecuperarPage';
import { RestablecerPage } from '../features/auth/RestablecerPage';
import { ForbiddenPage, NotFoundPage, SeccionNoEncontrada } from '../features/errors/ErrorPages';
import { VentasLayout } from '../features/ventas/VentasLayout';
import { ClientesPage } from '../features/ventas/clientes/ClientesPage';
import { PipelinePage } from '../features/ventas/pipeline/PipelinePage';
import { OportunidadesPage } from '../features/ventas/oportunidades/OportunidadesPage';
import { CotizacionesPage } from '../features/ventas/cotizaciones/CotizacionesPage';
import { PedidosPage } from '../features/ventas/pedidos/PedidosPage';
import { FacturasPage } from '../features/ventas/facturas/FacturasPage';
import { ReportesLayout } from '../features/ventas/reportes/ReportesLayout';
import { VentasPeriodoPage } from '../features/ventas/reportes/VentasPeriodoPage';
import { RankingClientesPage } from '../features/ventas/reportes/RankingClientesPage';
import { RankingProductosPage } from '../features/ventas/reportes/RankingProductosPage';
import { EmbudoPage } from '../features/ventas/reportes/EmbudoPage';
import { CarteraPage } from '../features/ventas/reportes/CarteraPage';
import { VendedoresPage } from '../features/ventas/reportes/VendedoresPage';
import { InventarioLayout } from '../features/inventario/InventarioLayout';
import { StockPage } from '../features/inventario/stock/StockPage';
import { ValuacionPage } from '../features/inventario/valuacion/ValuacionPage';
import { ProductosPage } from '../features/inventario/productos/ProductosPage';
import { AlmacenesPage } from '../features/inventario/almacenes/AlmacenesPage';
import { KardexPage } from '../features/inventario/kardex/KardexPage';
import { MovimientosPage } from '../features/inventario/movimientos/MovimientosPage';
import { TransferenciasPage } from '../features/inventario/transferencias/TransferenciasPage';
import { AjustesPage } from '../features/inventario/ajustes/AjustesPage';
import { AlertasPage } from '../features/inventario/alertas/AlertasPage';
import { ComprasLayout } from '../features/compras/ComprasLayout';
import { ProveedoresPage } from '../features/compras/proveedores/ProveedoresPage';
import { OrdenesPage } from '../features/compras/ordenes/OrdenesPage';
import { RecepcionesPage } from '../features/compras/recepciones/RecepcionesPage';
import { CuentasPorPagarPage } from '../features/compras/cuentas-por-pagar/CuentasPorPagarPage';
import { ConfiguracionPage } from '../features/compras/configuracion/ConfiguracionPage';
import { AdministracionLayout } from '../features/administracion/AdministracionLayout';
import { UsuariosPage } from '../features/administracion/usuarios/UsuariosPage';
import { RolesPage } from '../features/administracion/roles/RolesPage';
import { SeguridadPage } from '../features/administracion/seguridad/SeguridadPage';
import { BitacoraPage } from '../features/administracion/bitacora/BitacoraPage';
import { ActividadPage } from '../features/administracion/actividad/ActividadPage';
import { CuentaLayout } from '../features/cuenta/CuentaLayout';
import { PerfilPage } from '../features/cuenta/PerfilPage';
import { SesionesPage } from '../features/cuenta/SesionesPage';
import { ActivarTenantPage } from '../features/auth/ActivarTenantPage';
import { AccesoPage } from '../features/plataforma/AccesoPage';
import { PlataformaLayout } from '../features/plataforma/PlataformaLayout';
import { OrganizacionesPage } from '../features/plataforma/OrganizacionesPage';
import { InicioPage } from '../features/inicio/InicioPage';
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
  /*
   * Canje del enlace de alta de una organización. Pública y sin guard de
   * invitado, por lo mismo que las de arriba: quien la usa todavía no puede
   * autenticarse. El segmento no está en `core.dominio_reservado`, así que un
   * tenant registrado con este slug exacto quedaría inalcanzable — se cierra
   * añadiendo la palabra a esa tabla.
   */
  { path: '/activar-organizacion', element: <ActivarTenantPage /> },

  /*
   * Portal de plataforma: superficie separada con su propia sesión, su propio
   * layout y ninguna dependencia del tenant. El segmento `admin` está en
   * `core.dominio_reservado`, así que no puede colisionar con `:tenant`.
   */
  {
    path: '/admin/acceso',
    element: (
      <SoloInvitadoPlataforma>
        <AccesoPage />
      </SoloInvitadoPlataforma>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequiereSesionPlataforma>
        <PlataformaLayout />
      </RequiereSesionPlataforma>
    ),
    children: [
      { index: true, element: <Navigate to="organizaciones" replace /> },
      { path: 'organizaciones', element: <OrganizacionesPage /> },
    ],
  },
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
      { index: true, element: <InicioPage /> },
      {
        path: 'ventas',
        element: (
          <RequiereModulo codigo="VENTAS">
            <VentasLayout />
          </RequiereModulo>
        ),
        children: [
          { index: true, element: <Navigate to="clientes" replace /> },
          { path: 'clientes', element: <ClientesPage /> },
          { path: 'pipeline', element: <PipelinePage /> },
          { path: 'oportunidades', element: <OportunidadesPage /> },
          { path: 'cotizaciones', element: <CotizacionesPage /> },
          { path: 'pedidos', element: <PedidosPage /> },
          { path: 'facturas', element: <FacturasPage /> },
          {
            path: 'reportes',
            element: <ReportesLayout />,
            children: [
              { index: true, element: <Navigate to="periodo" replace /> },
              { path: 'periodo', element: <VentasPeriodoPage /> },
              { path: 'clientes', element: <RankingClientesPage /> },
              { path: 'productos', element: <RankingProductosPage /> },
              { path: 'embudo', element: <EmbudoPage /> },
              { path: 'cartera', element: <CarteraPage /> },
              { path: 'vendedores', element: <VendedoresPage /> },
            ],
          },
        ],
      },
      {
        path: 'inventario',
        element: (
          <RequiereModulo codigo="INVENTARIO">
            <InventarioLayout />
          </RequiereModulo>
        ),
        children: [
          { index: true, element: <Navigate to="stock" replace /> },
          { path: 'stock', element: <StockPage /> },
          { path: 'valuacion', element: <ValuacionPage /> },
          { path: 'productos', element: <ProductosPage /> },
          { path: 'almacenes', element: <AlmacenesPage /> },
          { path: 'kardex', element: <KardexPage /> },
          { path: 'movimientos', element: <MovimientosPage /> },
          { path: 'transferencias', element: <TransferenciasPage /> },
          { path: 'ajustes', element: <AjustesPage /> },
          { path: 'alertas', element: <AlertasPage /> },
        ],
      },
      {
        path: 'compras',
        element: (
          <RequiereModulo codigo="COMPRAS">
            <ComprasLayout />
          </RequiereModulo>
        ),
        children: [
          { index: true, element: <Navigate to="proveedores" replace /> },
          { path: 'proveedores', element: <ProveedoresPage /> },
          { path: 'ordenes', element: <OrdenesPage /> },
          { path: 'recepciones', element: <RecepcionesPage /> },
          { path: 'cuentas-por-pagar', element: <CuentasPorPagarPage /> },
          { path: 'configuracion', element: <ConfiguracionPage /> },
        ],
      },
      {
        // Sin guard de permiso: el autoservicio de la cuenta propia solo exige
        // estar autenticado, que es lo que ya garantiza la ruta del tenant.
        path: 'cuenta',
        element: <CuentaLayout />,
        children: [
          { index: true, element: <Navigate to="perfil" replace /> },
          { path: 'perfil', element: <PerfilPage /> },
          { path: 'sesiones', element: <SesionesPage /> },
        ],
      },
      {
        /*
         * Administración no cuelga de un módulo contratado sino de un permiso:
         * la puerta de entrada es poder leer el directorio de usuarios. El
         * `es_admin` del store hace el bypass para el TENANT_ADMIN.
         */
        path: 'administracion',
        element: (
          <RequierePermiso codigos={['core:usuarios:leer']}>
            <AdministracionLayout />
          </RequierePermiso>
        ),
        children: [
          { index: true, element: <Navigate to="usuarios" replace /> },
          { path: 'usuarios', element: <UsuariosPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'seguridad', element: <SeguridadPage /> },
          { path: 'bitacora', element: <BitacoraPage /> },
          { path: 'actividad', element: <ActividadPage /> },
        ],
      },
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
