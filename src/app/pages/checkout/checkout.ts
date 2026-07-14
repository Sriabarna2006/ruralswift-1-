// src/app/pages/checkout/checkout.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal, computed, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Address, Order } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { UiService } from '../../services/ui.service';
import { ImageKitService } from '../../services/imagekit.service';

type CheckoutStep = 'address' | 'payment' | 'review' | 'success';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  public api    = inject(ApiService);
  public cart   = inject(CartService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  public ui     = inject(UiService);
  private destroyRef = inject(DestroyRef);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();

  public step          = signal<CheckoutStep>('address');
  public addresses     = signal<Address[]>([]);
  public selectedAddr  = signal<Address | null>(null);
  public paymentMethod = signal<'cod' | 'upi' | 'card'>('cod');
  public notes         = signal('');
  public placingOrder  = signal(false);
  public placedOrder   = signal<Order | null>(null);
  public upiId         = signal('');

  public steps: { id: CheckoutStep; label: string }[] = [
    { id: 'address', label: 'Address' },
    { id: 'payment', label: 'Payment' },
    { id: 'review',  label: 'Review' },
  ];

  public currentStepIndex = computed(() =>
    this.steps.findIndex(s => s.id === this.step())
  );

  public subtotal = computed(() =>
    this.cart.items().reduce((s, i) => s + i.price * i.quantity, 0)
  );

  public delivery = computed(() =>
    this.subtotal() >= 499 ? 0 : 49
  );

  public total = computed(() => this.subtotal() + this.delivery());

  ngOnInit(): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }
    if (this.cart.items().length === 0) {
      this.router.navigate(['/cart']);
      return;
    }
    this.api.getAddresses().subscribe({
      next: res => {
        const addrs = res.data?.addresses ?? [];
        this.addresses.set(addrs);
        const def = addrs.find(a => a.is_default) ?? addrs[0] ?? null;
        this.selectedAddr.set(def);
      }
    });

    this.ui.addressSaved.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.api.getAddresses().subscribe({
        next: res => {
          const addrs = res.data?.addresses ?? [];
          this.addresses.set(addrs);
          if (!this.selectedAddr() && addrs.length > 0) {
            const def = addrs.find(a => a.is_default) ?? addrs[0] ?? null;
            this.selectedAddr.set(def);
          }
        }
      });
    });
  }
  goToStep(s: CheckoutStep): void { this.step.set(s); }

  nextStep(): void {
    if (this.step() === 'address') {
      if (!this.selectedAddr()) { this.toast.error('Please select a delivery address'); return; }
      this.step.set('payment');
    } else if (this.step() === 'payment') {
      if (this.paymentMethod() === 'upi' && !this.upiId().trim()) {
        this.toast.error('Please enter your UPI ID');
        return;
      }
      this.step.set('review');
    }
  }

  openAddressModal(title = 'Add New Address', address: any = null): void {
    this.ui.openAddressModal(title, address);
  }

  deleteAddress(id: number): void {
    if (confirm('Are you sure you want to delete this address?')) {
      this.api.deleteAddress(id).subscribe({
        next: () => {
          this.toast.success('Address deleted successfully');
          this.ui.addressSaved.next(); // trigger refresh
        },
        error: () => this.toast.error('Failed to delete address')
      });
    }
  }

  placeOrder(): void {
    if (!this.selectedAddr()) { this.toast.error('Select an address first'); return; }
    const addr = this.selectedAddr()!;
    const fullAddress = `${addr.full_name}, ${addr.address_line1}, ${addr.city}, ${addr.state} ${addr.pincode}`;

    this.placingOrder.set(true);
    this.api.placeOrder({
      deliveryAddress: fullAddress,
      paymentMethod: this.paymentMethod(),
      notes: this.notes(),
      items: this.cart.items().map(i => ({ product_id: i.product_id, quantity: i.quantity })),
    }).subscribe({
      next: (res) => {
        this.placedOrder.set(res.data?.order ?? null);
        this.step.set('success');
        this.cart.reset();
        this.placingOrder.set(false);
      },
      error: (err) => {
        this.placingOrder.set(false);
        this.toast.error(err?.error?.message || 'Failed to place order. Please try again.');
      }
    });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }
}
