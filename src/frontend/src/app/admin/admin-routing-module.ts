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
        redirectTo: 'settings/users',
        pathMatch: 'full',
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
          {
            path: 'email-logs',
            loadComponent: () =>
              import('./email-logs/email-logs.component').then((m) => m.EmailLogsComponent),
          },
          {
            path: 'users',
            loadComponent: () => import('./users-list/users-list').then((m) => m.UsersList),
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
