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
        loadComponent: () => import('./location-tabs/location-tabs').then((m) => m.LocationTabs),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LocationsRoutingModule {}
