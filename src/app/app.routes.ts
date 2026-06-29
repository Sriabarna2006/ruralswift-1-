import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home';
import { CustomerDashboardComponent } from './pages/customer-dashboard/customer-dashboard';
import { ProfileComponent } from './pages/profile/profile';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password';

import { ProductListingComponent } from './pages/product-listing/product-listing';
import { ProductDetailsComponent } from './pages/product-details/product-details';

export const routes: Routes = [

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'home', component: HomeComponent },

  { path: 'products', component: ProductListingComponent },

  {
    path: 'product-details/:id',
    component: ProductDetailsComponent
  },

  { path: 'dashboard', component: CustomerDashboardComponent },

  { path: 'profile', component: ProfileComponent },

  { path: 'forgot-password', component: ForgotPasswordComponent },

  { path: '**', redirectTo: 'login' }

];