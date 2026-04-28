import { Routes } from '@angular/router';
import { Layout } from './core/layout/layout';
import { AuthLayout } from './core/auth-layout/auth-layout';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayout,
    loadChildren: () => import('./auth/auth-routing-module').then((m) => m.AuthRoutingModule),
  },
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        loadChildren: () => import('./core/core-routing-module').then((m) => m.CoreRoutingModule),
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./products/products-routing-module').then((m) => m.ProductsRoutingModule),
      },
      {
        path: 'locations',
        loadChildren: () =>
          import('./locations/locations-routing-module').then((m) => m.LocationsRoutingModule),
      },
      {
        path: 'cart',
        loadChildren: () => import('./cart/cart-routing-module').then((m) => m.CartRoutingModule),
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./admin/admin-routing-module').then((m) => m.AdminRoutingModule),
      },
      {
        path: 'orders',
        loadChildren: () =>
          import('./orders/orders-routing-module').then((m) => m.OrdersRoutingModule),
      },
    ],
  },
];
