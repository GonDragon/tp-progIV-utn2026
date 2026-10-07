import { Routes } from '@angular/router';
import { dashboardGuard, loginGuard, principalGuard, registerGuard, perfilGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/principal/principal').then(m => m.Principal),
    canActivate: [principalGuard]
  },
  {
    path: 'busqueda',
    loadComponent: () => import('./pages/busqueda/busqueda').then(m => m.Busqueda),
    canActivate: [principalGuard]
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then(m => m.Perfil),
    canActivate: [perfilGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [dashboardGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    canActivate: [loginGuard]
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.Registro),
    canActivate: [registerGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
