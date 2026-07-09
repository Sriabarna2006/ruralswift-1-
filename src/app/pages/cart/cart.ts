// src/app/pages/cart/cart.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CartComponent implements OnInit {

  private cart = inject(CartService);

  // Expose reactive signals from CartService via getters
  get items()     { return this.cart.items; }
  get loading()   { return this.cart.loading; }
  get subtotal()  { return this.cart.total; }
  get itemCount() { return this.cart.itemCount; }

  get shipping(): number { return this.cart.total() > 0 ? 40 : 0; }
  get total(): number    { return this.cart.total() + this.shipping; }

  toastMsg  = '';
  showToast = false;
  placingOrder = false;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cart.load();
  }

  updateQuantity(productId: number, delta: number): void {
    const item = this.items().find(i => i.product_id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) { this.removeItem(productId); return; }
    this.cart.updateQuantity(productId, newQty);
  }

  removeItem(productId: number): void {
    this.cart.removeItem(productId);
    this._toast('Item removed from cart.');
  }

  clearCart(): void {
    if (!confirm('Clear all items from cart?')) return;
    this.cart.clear();
  }

  /** Place order — requires login */
  placeOrder(): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    if (this.items().length === 0) return;

    this.placingOrder = true;
    this.api.placeOrder({
      deliveryAddress: 'Default Address',
      paymentMethod:   'cod',
      items: this.items().map(i => ({ product_id: i.product_id, quantity: i.quantity }))
    }).subscribe({
      next: () => {
        this.placingOrder = false;
        this.cart.clear();
        this._toast('Order placed successfully! 🎉');
        setTimeout(() => this.router.navigate(['/dashboard'], { queryParams: { section: 'orders' } }), 1500);
      },
      error: (err) => {
        this.placingOrder = false;
        this._toast(err.error?.message || 'Failed to place order. Please try again.', true);
      }
    });
  }

  private _toast(msg: string, isError = false): void {
    this.toastMsg  = msg;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 2500);
  }
}
