// src/app/services/cart.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiService, CartItem } from './api.service';

@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly baseUrl = 'http://localhost:3000/api';

  // Reactive signal-based cart state — server-side only
  private _items   = signal<CartItem[]>([]);
  private _loading = signal(false);

  readonly items   = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly itemCount = computed(() =>
    this._items().reduce((sum, i) => sum + i.quantity, 0)
  );
  readonly total = computed(() =>
    this._items().reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  constructor(
    private http:   HttpClient,
    private api:    ApiService,
    private router: Router
  ) {}

  /** Load cart from server — requires authentication */
  load(): void {
    if (!this.api.isLoggedIn()) {
      this._items.set([]);
      return;
    }
    this._loading.set(true);
    this.http.get<any>(`${this.baseUrl}/cart`).subscribe({
      next: (res) => {
        this._items.set(res.data?.items ?? []);
        this._loading.set(false);
      },
      error: () => {
        this._items.set([]);
        this._loading.set(false);
      }
    });
  }

  /** Add item — redirects to login if not authenticated */
  addItem(productId: number, quantity: number = 1): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }
    this.http.post<any>(`${this.baseUrl}/cart`, { product_id: productId, quantity }).subscribe({
      next: () => this.load(),
      error: (e) => console.error('[CartService] addItem error', e)
    });
  }

  /** Update quantity */
  updateQuantity(productId: number, quantity: number): void {
    if (quantity < 1) { this.removeItem(productId); return; }
    if (!this.api.isLoggedIn()) return;

    this.http.put<any>(`${this.baseUrl}/cart/${productId}`, { quantity }).subscribe({
      next: () => this.load(),
      error: (e) => console.error('[CartService] updateQty error', e)
    });
  }

  /** Remove one item */
  removeItem(productId: number): void {
    if (!this.api.isLoggedIn()) return;
    this.http.delete<any>(`${this.baseUrl}/cart/${productId}`).subscribe({
      next: () => this.load(),
      error: (e) => console.error('[CartService] removeItem error', e)
    });
  }

  /** Clear entire cart */
  clear(): void {
    if (!this.api.isLoggedIn()) { this._items.set([]); return; }
    this.http.delete<any>(`${this.baseUrl}/cart`).subscribe({
      next: () => { this._items.set([]); },
      error: (e) => console.error('[CartService] clear error', e)
    });
  }

  /** Reset local state (e.g. on logout) */
  reset(): void {
    this._items.set([]);
  }
}
