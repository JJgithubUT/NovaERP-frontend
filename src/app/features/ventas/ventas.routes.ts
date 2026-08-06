import type { Routes } from '@angular/router';

/**
 * Las secciones cuelgan de un layout con pestañas, igual que Inventario. El
 * orden sigue la cadena comercial, no el alfabeto.
 */
export const ventasRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./ventas.layout').then((m) => m.VentasLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'clientes' },
      {
        path: 'clientes',
        title: 'Clientes · NovaERP',
        loadComponent: () => import('./clientes/clientes.page').then((m) => m.ClientesPage),
      },
      {
        path: 'pipeline',
        title: 'Pipeline · NovaERP',
        loadComponent: () => import('./pipeline/pipeline.page').then((m) => m.PipelinePage),
      },
      {
        path: 'oportunidades',
        title: 'Oportunidades · NovaERP',
        loadComponent: () =>
          import('./oportunidades/oportunidades.page').then((m) => m.OportunidadesPage),
      },
      {
        path: 'cotizaciones',
        title: 'Cotizaciones · NovaERP',
        loadComponent: () =>
          import('./cotizaciones/cotizaciones.page').then((m) => m.CotizacionesPage),
      },
      {
        path: 'pedidos',
        title: 'Pedidos · NovaERP',
        loadComponent: () => import('./pedidos/pedidos.page').then((m) => m.PedidosPage),
      },
      {
        path: 'facturas',
        title: 'Facturas · NovaERP',
        loadComponent: () => import('./facturas/facturas.page').then((m) => m.FacturasPage),
      },
    ],
  },
];
