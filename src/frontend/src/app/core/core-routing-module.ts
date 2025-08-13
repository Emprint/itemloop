import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Layout } from './layout/layout';
import { Home } from './home/home';

const routes: Routes = [
  {
    path: '',
  component: Layout,
    children: [
      {
        path: '',
  component: Home
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoreRoutingModule { }
