import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadChildren: () => import('./core/core-routing-module').then(m => m.CoreRoutingModule)
	},
	{
		path: 'products',
		loadChildren: () => import('./products/products-routing-module').then(m => m.ProductsRoutingModule)
	},
	{
		path: 'locations',
		loadChildren: () => import('./locations/locations-routing-module').then(m => m.LocationsRoutingModule)
	},
	{
		path: 'auth',
		loadChildren: () => import('./auth/auth-routing-module').then(m => m.AuthRoutingModule)
	},
	{
		path: 'cart',
		loadChildren: () => import('./cart/cart-routing-module').then(m => m.CartRoutingModule)
	},
	{
		path: 'admin',
		loadChildren: () => import('./admin/admin-routing-module').then(m => m.AdminRoutingModule)
	}
];
