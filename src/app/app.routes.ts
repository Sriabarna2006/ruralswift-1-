// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Default → home
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Home
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
  },

  // Product Listing (shop)
  {
    path: 'products',
    loadComponent: () => import('./pages/product-listing/product-listing').then(m => m.ProductListingComponent)
  },

  // Product Details
  {
    path: 'product-details/:id',
    loadComponent: () => import('./pages/product-details/product-details').then(m => m.ProductDetailsComponent)
  },

  // Cart
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/cart/cart').then(m => m.CartComponent)
  },

  // Checkout (new)
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/checkout/checkout').then(m => m.CheckoutComponent)
  },

  // Account (tabbed — replaces dashboard + profile)
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/account').then(m => m.AccountComponent)
  },

  // Order Tracking
  {
    path: 'order-tracking',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order-tracking/order-tracking').then(m => m.OrderTrackingComponent)
  },

  // Seller Hub
  {
    path: 'seller-hub',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/seller-hub/seller-hub').then(m => m.SellerHubComponent)
  },

  // Auth pages (standalone fallback — main auth uses overlay)
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
  },

  // Legacy redirects
  { path: 'dashboard', redirectTo: 'account', pathMatch: 'full' },
  { path: 'profile',   redirectTo: 'account', pathMatch: 'full' },

  // Wildcard fallback
  { path: '**', redirectTo: 'home' }
];
