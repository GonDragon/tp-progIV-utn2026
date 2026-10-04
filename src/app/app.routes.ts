import { Routes } from '@angular/router';
import { Principal } from './pages/principal/principal';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { dashboardGuard, loginGuard, principalGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    component: Principal,
    canActivate: [principalGuard]
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [dashboardGuard]
  },
  {
    path: 'login',
    component: Login,
    canActivate: [loginGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
