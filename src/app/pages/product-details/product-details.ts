import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ApiService, Product } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { NavbarComponent } from '../../components/navbar/navbar';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, DecimalPipe],
  templateUrl: './product-details.html',
  styleUrls: ['./product-details.css']
})
export class ProductDetailsComponent implements OnInit {

  product: Product | null = null;
  loading  = false;
  error    = '';

  quantity     = 1;
  addingToCart = false;
  togglingWish = false;
  inWishlist   = false;
  toastMsg     = '';
  showToast    = false;

  constructor(
    private route:  ActivatedRoute,
    private api:    ApiService,
    private cart:   CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cart.load();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error = 'Invalid product ID.'; return; }
    this.loadProduct(id);
  }

  loadProduct(id: number): void {
    this.loading = true;
    this.api.getProduct(id).subscribe({
      next: (res) => {
        this.product = (res as any).data?.product ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error   = 'Product not found or server error.';
      }
    });
  }

  incrementQty(): void {
    if (this.product && this.quantity < this.product.stock) this.quantity++;
  }

  decrementQty(): void {
    if (this.quantity > 1) this.quantity--;
  }

  addToCart(): void {
    if (!this.product) return;
    this.addingToCart = true;
    this.cart.addItem(this.product.product_id, this.quantity);
    setTimeout(() => {
      this.addingToCart = false;
      this._toast(`"${this.product!.name}" added to cart!`);
    }, 600);
  }

  toggleWishlist(): void {
    if (!this.api.isLoggedIn()) { this.router.navigate(['/login']); return; }
    if (!this.product) return;
    this.togglingWish = true;

    const call = this.inWishlist
      ? this.api.removeFromWishlist(this.product.product_id)
      : this.api.addToWishlist(this.product.product_id);

    call.subscribe({
      next: () => {
        this.inWishlist   = !this.inWishlist;
        this.togglingWish = false;
        this._toast(this.inWishlist ? 'Added to wishlist ♥' : 'Removed from wishlist');
      },
      error: () => { this.togglingWish = false; }
    });
  }

  getDiscount(price: number, mrp: number): number {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  fallbackImg(event: Event): void {
    (event.target as HTMLImageElement).src = 'https://placehold.co/500x500/f1f5f9/475569?text=Product';
  }

  private _toast(msg: string): void {
    this.toastMsg  = msg;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 2500);
  }
}