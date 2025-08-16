import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Layout } from '../core/layout/layout';
import { Login } from './login/login';
import { Register } from './register/register';

const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: 'login', component: Login },
      { path: 'register', component: Register },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
