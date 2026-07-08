// src/app/pages/product-details/product-details.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService, Product } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { UiService } from '../../services/ui.service';
import { ToastService } from '../../services/toast.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsComponent implements OnInit {
  private api    = inject(ApiService);
  private cart   = inject(CartService);
  private ui     = inject(UiService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();

  public product     = signal<Product | null>(null);
  public isLoading   = signal(true);
  public quantity    = signal(1);
  public activeImage = signal(0);
  public inWishlist  = signal(false);
  public activeTab   = signal<'description' | 'reviews' | 'shipping'>('description');
  public addingCart  = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/products']); return; }
    this.api.getProduct(id).subscribe({
      next: (res) => {
        this.product.set(res.data?.product ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Product not found.');
        this.router.navigate(['/products']);
      }
    });
  }

  get images(): string[] {
    const p = this.product();
    if (!p) return [];
    const all = p.images?.length ? p.images : [p.image_url];
    return all.filter(Boolean);
  }

  increment(): void {
    const p = this.product();
    if (p && this.quantity() < p.stock) this.quantity.update(q => q + 1);
  }

  decrement(): void {
    if (this.quantity() > 1) this.quantity.update(q => q - 1);
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.addingCart.set(true);
    this.cart.addItem(p.product_id, this.quantity());
    this.toast.success(`${p.name} added to cart`);
    setTimeout(() => this.addingCart.set(false), 600);
  }

  buyNow(): void {
    const p = this.product();
    if (!p) return;
    if (!this.api.isLoggedIn()) { this.ui.openAuth('login'); return; }
    this.cart.addItem(p.product_id, this.quantity());
    this.router.navigate(['/cart']);
  }

  toggleWishlist(): void {
    if (!this.api.isLoggedIn()) { this.ui.openAuth('login'); return; }
    const p = this.product();
    if (!p) return;
    const call = this.inWishlist()
      ? this.api.removeFromWishlist(p.product_id)
      : this.api.addToWishlist(p.product_id);
    call.subscribe({
      next: () => {
        this.inWishlist.update(v => !v);
        this.toast.info(this.inWishlist() ? 'Added to wishlist' : 'Removed from wishlist');
      }
    });
  }

  discount(price: number, mrp: number): number {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }

  starsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i);
  }

  isFilled(index: number, rating: number): boolean {
    return index < Math.floor(rating);
  }
}
