import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../auth/auth.guard';
import { editorGuard } from './editor.guard';

const routes: Routes = [
  {
    path: 'my',
    canActivate: [authGuard],
    loadComponent: () => import('./my-orders/my-orders').then((m) => m.MyOrders),
  },
  {
    path: 'all',
    canActivate: [editorGuard],
    loadComponent: () => import('./orders-list/orders-list').then((m) => m.OrdersList),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrdersRoutingModule {}
