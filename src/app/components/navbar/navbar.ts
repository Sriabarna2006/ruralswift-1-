// src/app/components/navbar/navbar.ts
import {
  Component, ChangeDetectionStrategy, inject, computed
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { CartService } from '../../services/cart.service';
import { AuthStateService } from '../../services/auth-state.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private api    = inject(ApiService);
  private router = inject(Router);
  private auth   = inject(AuthStateService);
  private imageKit = inject(ImageKitService);
  public ui   = inject(UiService);
  public cart = inject(CartService);

  public brandLogo = this.imageKit.resolve('logo.png', 'logo');
  public brandLogoFallback = this.imageKit.placeholder('logo');

  public searchQuery = '';
  public userGreeting = computed(() => {
    const user = this.auth.user();
    return user ? `Hello, ${user.first_name || 'User'}` : 'Hello, sign in';
  });
  public isLoggedIn = computed(() => !!this.auth.token());

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], {
        queryParams: { search: this.searchQuery.trim() }
      });
    }
  }

  handleAccountClick(): void {
    if (this.api.isLoggedIn()) {
      this.router.navigate(['/account']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  openLocationModal(): void {
    this.ui.openLocationModal();
  }

  handleImageError(event: Event, fallback: string): void {
    (event.target as HTMLImageElement).src = fallback;
  }
}
