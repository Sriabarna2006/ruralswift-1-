// src/app/pages/account/account.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, UserProfile, Order, Address } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { ToastService } from '../../services/toast.service';
import { ImageKitService } from '../../services/imagekit.service';

type AccountTab = 'profile' | 'orders' | 'wishlist' | 'addresses' | 'payments' | 'preferences' | 'help';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountComponent implements OnInit {
  private api    = inject(ApiService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private ui     = inject(UiService);
  private toast  = inject(ToastService);
  public imageKit = inject(ImageKitService);
  private destroyRef = inject(DestroyRef);
  public readonly placeholderImage = this.imageKit.placeholder();

  public activeTab   = signal<AccountTab>('profile');
  public user        = signal<UserProfile | null>(null);
  public orders      = signal<Order[]>([]);
  public addresses   = signal<Address[]>([]);
  public wishlist    = signal<any[]>([]);
  public isLoading   = signal(true);
  public isEditingProfile = signal(false);

  // Edit form
  editForm: Partial<UserProfile> = {};

  tabs: { id: AccountTab; label: string; icon: string }[] = [
    { id: 'profile',     label: 'Profile',         icon: '👤' },
    { id: 'orders',      label: 'My Orders',        icon: '📦' },
    { id: 'wishlist',    label: 'Wishlist',         icon: '❤️' },
    { id: 'addresses',   label: 'Addresses',        icon: '📍' },
    { id: 'payments',    label: 'Payment Methods',  icon: '💳' },
    { id: 'preferences', label: 'Preferences',      icon: '⚙️' },
    { id: 'help',        label: 'Help Center',      icon: '❓' },
  ];

  ngOnInit(): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // Read tab from query param
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as AccountTab;
      if (tab && this.tabs.some(t => t.id === tab)) {
        this.activeTab.set(tab);
      }
    });

    this.loadAll();

    this.ui.addressSaved.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.api.getAddresses().subscribe({
        next: (res) => this.addresses.set(res.data?.addresses ?? [])
      });
    });
  }

  private loadAll(): void {
    this.isLoading.set(true);
    const stored = this.api.getStoredUser();
    this.user.set(stored);

    this.api.getProfile().subscribe({
      next: (res) => {
        this.user.set(res.user);
        this.editForm = { ...res.user };
      },
      error: () => {}
    });

    this.api.getOrders().subscribe({
      next: (res) => this.orders.set(res.data?.orders ?? []),
      error: () => {}
    });

    this.api.getAddresses().subscribe({
      next: (res) => {
        this.addresses.set(res.data?.addresses ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.api.getWishlist().subscribe({
      next: (res) => this.wishlist.set(res.data?.items ?? []),
      error: () => {}
    });
  }

  setTab(tab: AccountTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], { queryParams: { tab }, replaceUrl: true });
  }

  startEditProfile(): void {
    this.editForm = { ...this.user()! };
    this.isEditingProfile.set(true);
  }

  cancelEditProfile(): void {
    this.isEditingProfile.set(false);
  }

  saveProfile(): void {
    this.api.updateProfile(this.editForm).subscribe({
      next: (res) => {
        this.user.set(res.user);
        this.isEditingProfile.set(false);
        this.toast.success('Profile updated successfully');
      },
      error: () => this.toast.error('Failed to update profile')
    });
  }

  handleLogout(): void {
    this.api.logout();
    this.router.navigate(['/home']);
    this.toast.success('Signed out successfully');
  }

  goToShop(): void {
    this.router.navigate(['/products']);
  }

  comingSoon(): void {
    this.toast.info('This feature is coming soon!');
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

  get userInitials(): string {
    const u = this.user();
    if (!u) return '--';
    return `${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase() || '--';
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      delivered: 'status--delivered',
      cancelled: 'status--cancelled',
      shipped:   'status--shipped',
      processing:'status--processing',
      pending:   'status--pending',
    };
    return map[status?.toLowerCase()] || 'status--pending';
  }
}
