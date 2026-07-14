// src/app/app.ts
import {
  Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadingOverlayComponent } from './components/loading-overlay/loading-overlay';
import { NavbarComponent } from './components/navbar/navbar';
import { MobileHeaderComponent } from './components/mobile-header/mobile-header';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav';
import { DrawerComponent } from './components/drawer/drawer';
import { AuthOverlayComponent } from './components/auth-overlay/auth-overlay';
import { ToastComponent } from './components/toast/toast';
import { AddressModalComponent } from './components/address-modal/address-modal';

import { UiService } from './services/ui.service';
import { CartService } from './services/cart.service';
import { ApiService } from './services/api.service';
import { AuthStateService } from './services/auth-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    LoadingOverlayComponent,
    NavbarComponent,
    MobileHeaderComponent,
    BottomNavComponent,
    DrawerComponent,
    AuthOverlayComponent,
    ToastComponent,
    AddressModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  public ui   = inject(UiService);
  private api    = inject(ApiService);
  private cart   = inject(CartService);
  private auth   = inject(AuthStateService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.auth.restoreSession();

    // Restore cart if user is logged in
    if (this.api.isLoggedIn()) {
      this.cart.load();
    }

    void this.auth.validateSession();

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.resetScrollViewport());

    this.resetScrollViewport();
  }

  private resetScrollViewport(): void {
    requestAnimationFrame(() => {
      const viewport = document.getElementById('app-scroll-viewport');
      if (viewport) {
        viewport.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }
}
