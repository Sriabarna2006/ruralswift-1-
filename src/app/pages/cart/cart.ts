// src/app/pages/cart/cart.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal, computed
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { ApiService, CartItem } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { ToastService } from '../../services/toast.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent implements OnInit {
  public cartSvc = inject(CartService);
  private api       = inject(ApiService);
  private ui        = inject(UiService);
  private toast     = inject(ToastService);
  private router    = inject(Router);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();

  public couponCode  = signal('');
  public couponApplied = signal(false);
  public couponDiscount = signal(0);
  public isApplyingCoupon = signal(false);

  public readonly deliveryFee = 49;
  public readonly freeDeliveryThreshold = 499;

  public subtotal = computed(() =>
    this.cartSvc.items().reduce((s, i) => s + i.price * i.quantity, 0)
  );

  public effectiveDelivery = computed(() =>
    this.subtotal() >= this.freeDeliveryThreshold ? 0 : this.deliveryFee
  );

  public total = computed(() =>
    this.subtotal() + this.effectiveDelivery() - this.couponDiscount()
  );

  public savings = computed(() =>
    this.cartSvc.items().reduce((s, i) => s + (i.mrp - i.price) * i.quantity, 0)
  );

  ngOnInit(): void {
    if (this.api.isLoggedIn()) {
      this.cartSvc.load();
    }
  }

  updateQty(item: CartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.removeItem(item);
      return;
    }
    if (newQty > item.stock) return;
    this.cartSvc.updateQuantity(item.product_id, newQty);
  }

  removeItem(item: CartItem): void {
    this.cartSvc.removeItem(item.product_id);
    this.toast.info(`${item.name} removed from cart`);
  }

  applyCoupon(): void {
    const code = this.couponCode().trim().toUpperCase();
    if (!code) return;
    this.isApplyingCoupon.set(true);
    setTimeout(() => {
      if (code === 'RURAL10') {
        const disc = Math.round(this.subtotal() * 0.10);
        this.couponDiscount.set(disc);
        this.couponApplied.set(true);
        this.toast.success(`Coupon applied! You saved ${this.fmt(disc)}`);
      } else {
        this.toast.error('Invalid or expired coupon code');
      }
      this.isApplyingCoupon.set(false);
    }, 600);
  }

  removeCoupon(): void {
    this.couponApplied.set(false);
    this.couponDiscount.set(0);
    this.couponCode.set('');
  }

  checkout(): void {
    if (!this.api.isLoggedIn()) {
      this.ui.openAuth('login');
      return;
    }
    this.router.navigate(['/checkout']);
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }
}
