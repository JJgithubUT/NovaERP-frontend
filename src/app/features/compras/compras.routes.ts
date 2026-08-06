import type { Routes } from '@angular/router';

/** Las secciones cuelgan de un layout con pestañas, igual que los otros módulos. */
export const comprasRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./compras.layout').then((m) => m.ComprasLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'proveedores' },
      {
        path: 'proveedores',
        title: 'Proveedores · NovaERP',
        loadComponent: () =>
          import('./proveedores/proveedores.page').then((m) => m.ProveedoresPage),
      },
      {
        path: 'ordenes',
        title: 'Órdenes de compra · NovaERP',
        loadComponent: () => import('./ordenes/ordenes.page').then((m) => m.OrdenesPage),
      },
      {
        path: 'recepciones',
        title: 'Recepciones · NovaERP',
        loadComponent: () =>
          import('./recepciones/recepciones.page').then((m) => m.RecepcionesPage),
      },
      {
        path: 'cuentas-por-pagar',
        title: 'Cuentas por pagar · NovaERP',
        loadComponent: () =>
          import('./cuentas-por-pagar/cuentas-por-pagar.page').then((m) => m.CuentasPorPagarPage),
      },
      {
        path: 'configuracion',
        title: 'Configuración de compras · NovaERP',
        loadComponent: () =>
          import('./configuracion/configuracion.page').then((m) => m.ConfiguracionPage),
      },
    ],
  },
];
