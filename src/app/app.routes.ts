import { Routes } from '@angular/router';
import { Principal } from './pages/principal/principal';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { Registro } from './pages/registro/registro';
import { Busqueda } from './pages/busqueda/busqueda';
import { Perfil } from './pages/perfil/perfil';
import { dashboardGuard, loginGuard, principalGuard, registerGuard, perfilGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    component: Principal,
    canActivate: [principalGuard]
  },
  {
    path: 'busqueda',
    component: Busqueda,
    canActivate: [principalGuard]
  },
  {
    path: 'buscar',
    redirectTo: 'busqueda'
  },
  {
    path: 'search',
    redirectTo: 'busqueda'
  },
  {
    path: 'perfil',
    component: Perfil,
    canActivate: [perfilGuard]
  },
  {
    path: 'profile',
    redirectTo: 'perfil'
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
    path: 'registro',
    component: Registro,
    canActivate: [registerGuard]
  },
  {
    path: 'register',
    redirectTo: 'registro'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
