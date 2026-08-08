import type { Routes } from '@angular/router';

/**
 * Las nueve vistas cuelgan de un layout común que pinta la cabecera y las
 * pestañas. Cada una es su propio chunk: entrar a Inventario no descarga las
 * nueve, solo la que se abre.
 */
export const inventarioRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./inventario.layout').then((m) => m.InventarioLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'stock' },
      {
        path: 'stock',
        title: 'Stock · NovaERP',
        loadComponent: () => import('./stock/stock.page').then((m) => m.StockPage),
      },
      {
        path: 'productos',
        title: 'Productos · NovaERP',
        loadComponent: () => import('./productos/productos.page').then((m) => m.ProductosPage),
      },
      {
        path: 'almacenes',
        title: 'Almacenes · NovaERP',
        loadComponent: () => import('./almacenes/almacenes.page').then((m) => m.AlmacenesPage),
      },
      {
        path: 'kardex',
        title: 'Kardex · NovaERP',
        loadComponent: () => import('./kardex/kardex.page').then((m) => m.KardexPage),
      },
      {
        path: 'valuacion',
        title: 'Valuación · NovaERP',
        loadComponent: () => import('./valuacion/valuacion.page').then((m) => m.ValuacionPage),
      },
      {
        path: 'movimientos',
        title: 'Movimientos · NovaERP',
        loadComponent: () =>
          import('./movimientos/movimientos.page').then((m) => m.MovimientosPage),
      },
      {
        path: 'transferencias',
        title: 'Transferencias · NovaERP',
        loadComponent: () =>
          import('./transferencias/transferencias.page').then((m) => m.TransferenciasPage),
      },
      {
        path: 'ajustes',
        title: 'Ajustes · NovaERP',
        loadComponent: () => import('./ajustes/ajustes.page').then((m) => m.AjustesPage),
      },
      {
        path: 'alertas',
        title: 'Alertas de stock · NovaERP',
        loadComponent: () => import('./alertas/alertas.page').then((m) => m.AlertasPage),
      },
    ],
  },
];
