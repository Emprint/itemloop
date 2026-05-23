import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminGuard } from './admin.guard';
import { editorGuard } from './editor.guard';

const routes: Routes = [
  {
    path: 'attributes',
    canActivate: [editorGuard],
    loadComponent: () =>
      import('./attributes/attributes.component').then((m) => m.AttributesComponent),
  },
  {
    path: '',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'users',
        loadComponent: () => import('./users-list/users-list').then((m) => m.UsersList),
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./settings-dashboard/settings-dashboard.component').then(
                (m) => m.SettingsDashboardComponent,
              ),
          },
          {
            path: 'general',
            loadComponent: () =>
              import('./app-settings/app-settings.component').then((m) => m.AppSettingsComponent),
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
