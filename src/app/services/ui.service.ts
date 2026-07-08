// src/app/services/ui.service.ts
// Controls global UI state: drawers, modals, auth overlay, loading screen
import { Injectable, signal } from '@angular/core';

export type DrawerMode = 'nav' | 'account' | null;

@Injectable({
  providedIn: 'root'
})
export class UiService {
  // Loading screen
  readonly isLoading = signal(true);

  // Auth overlay (global login/signup modal)
  readonly authOverlayOpen = signal(false);
  readonly authMode = signal<'login' | 'signup'>('login');

  // Mobile drawer
  readonly drawerOpen = signal(false);
  readonly drawerMode = signal<DrawerMode>(null);

  // Location modal
  readonly locationModalOpen = signal(false);

  // Address modal
  readonly addressModalOpen = signal(false);
  readonly addressModalTitle = signal('Add New Address');

  // ── Loading ──────────────────────────────────────────────────
  hideLoading(): void {
    this.isLoading.set(false);
    document.body.classList.remove('scroll-locked');
  }

  // ── Auth Overlay ─────────────────────────────────────────────
  openAuth(mode: 'login' | 'signup' = 'login'): void {
    this.authMode.set(mode);
    this.authOverlayOpen.set(true);
    this.closeDrawer(true);
    document.body.classList.add('scroll-locked');
  }

  closeAuth(): void {
    this.authOverlayOpen.set(false);
    document.body.classList.remove('scroll-locked');
  }

  toggleAuthMode(mode: 'login' | 'signup'): void {
    this.authMode.set(mode);
  }

  // ── Drawer ───────────────────────────────────────────────────
  openDrawer(mode: DrawerMode = 'nav'): void {
    this.drawerMode.set(mode);
    this.drawerOpen.set(true);
    document.body.classList.add('scroll-locked');
  }

  closeDrawer(silent = false): void {
    this.drawerOpen.set(false);
    if (!silent) {
      document.body.classList.remove('scroll-locked');
    }
  }

  // ── Location Modal ───────────────────────────────────────────
  openLocationModal(): void {
    this.locationModalOpen.set(true);
    document.body.classList.add('scroll-locked');
  }

  closeLocationModal(): void {
    this.locationModalOpen.set(false);
    document.body.classList.remove('scroll-locked');
  }

  // ── Address Modal ────────────────────────────────────────────
  openAddressModal(title = 'Add New Address'): void {
    this.addressModalTitle.set(title);
    this.addressModalOpen.set(true);
    document.body.classList.add('scroll-locked');
  }

  closeAddressModal(): void {
    this.addressModalOpen.set(false);
    document.body.classList.remove('scroll-locked');
  }
}
