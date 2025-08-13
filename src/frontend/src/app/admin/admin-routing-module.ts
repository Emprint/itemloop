
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Layout } from '../core/layout/layout';

const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        loadComponent: () => import('./admin-dashboard/admin-dashboard').then(m => m.AdminDashboard)
      },
      {
        path: 'users',
        loadComponent: () => import('./users-list/users-list').then(m => m.UsersList)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
