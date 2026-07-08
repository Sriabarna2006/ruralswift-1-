// src/app/components/mobile-header/mobile-header.ts
import {
  Component, ChangeDetectionStrategy, inject
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../services/ui.service';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-mobile-header',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './mobile-header.html',
  styleUrl: './mobile-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileHeaderComponent {
  public ui   = inject(UiService);
  public cart = inject(CartService);
  private api    = inject(ApiService);
  private router = inject(Router);
  private imageKit = inject(ImageKitService);

  public brandLogo = this.imageKit.resolve('logo.png', 'logo');
  public brandLogoFallback = this.imageKit.placeholder('logo');

  searchQuery = '';

  openMenu(): void {
    this.ui.openDrawer('nav');
  }

  handleAccountClick(): void {
    if (this.api.isLoggedIn()) {
      this.ui.openDrawer('account');
    } else {
      this.ui.openAuth('login');
    }
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], {
        queryParams: { search: this.searchQuery.trim() }
      });
    }
  }

  handleImageError(event: Event, fallback: string): void {
    (event.target as HTMLImageElement).src = fallback;
  }
}
