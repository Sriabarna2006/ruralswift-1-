// src/app/pages/customer-dashboard/customer-dashboard.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgClass, CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, UserProfile, Order as ApiOrder, Address, Notification } from '../../services/api.service';
import { NavbarComponent } from '../../components/navbar/navbar';


export interface OrderItem {
  name:  string;
  qty:   number;
  image: string;
}

export interface Order {
  id:                string;
  date:              string;
  total:             number;
  status:            'Placed' | 'Confirmed' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  estimatedDelivery: string;
  items:             OrderItem[];
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass, CommonModule, FormsModule, NavbarComponent, TitleCasePipe, DatePipe],
  templateUrl: './customer-dashboard.html',
  styleUrls: ['./customer-dashboard.css']
})
export class CustomerDashboardComponent implements OnInit {

  customerName     = '';
  selectedSection  = 'dashboard';
  orderSearchQuery = '';
  sidebarOpen      = false;

  // UI state
  profileLoading  = false;
  profileSaving   = false;
  toastMessage    = '';
  toastType: 'success' | 'error' = 'success';
  showToast       = false;

  // Section loading states
  ordersLoading       = false;
  addressesLoading    = false;
  wishlistLoading     = false;
  notificationsLoading = false;

  // Profile form model
  profileForm: UserProfile = { first_name: '', last_name: '', email: '', phone: '' };

  // Orders
  ordersList: Order[] = [];

  // Addresses
  addressList: Address[] = [];
  showAddressForm = false;
  savingAddress   = false;
  newAddress: Partial<Address> = { label: 'Home', full_name: '', phone: '', address_line1: '', city: '', state: '', pincode: '', is_default: false };

  // Wishlist
  wishlistItems: any[] = [];

  // Notifications
  notificationList: Notification[] = [];
  unreadCount = 0;

  // Stats (derived from loaded data)
  totalOrders    = 0;
  activeOrders   = 0;
  deliveredOrders = 0;

  constructor(
    private api:    ApiService,
    private router: Router,
    private route:  ActivatedRoute
  ) {}

  // ── Sidebar ───────────────────────────────────────────────────
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeSidebar(); }

  // ── Init ──────────────────────────────────────────────────────
  ngOnInit(): void {
    if (!this.api.getToken()) { this.router.navigate(['/login']); return; }

    const stored = this.api.getStoredUser();
    if (stored) {
      this.customerName = stored.first_name || stored.email || 'Customer';
      this.profileForm  = { ...stored };
    } else {
      this.customerName = localStorage.getItem('customerName') || 'Customer';
    }

    // Deep-link via ?section=
    this.route.queryParams.subscribe(params => {
      if (params['section']) this.setSection(params['section']);
    });

    // Load orders and notifications on init
    this.loadOrders();
    this.loadNotifications();
  }


  setSection(section: string): void {
    this.selectedSection = section;
    this.closeSidebar();

    if (section === 'profile')       this.loadProfile();
    if (section === 'orders')        this.loadOrders();
    if (section === 'address')       this.loadAddresses();
    if (section === 'wishlist')      this.loadWishlist();
    if (section === 'notifications') this.loadNotifications();
  }

  // ── Orders ────────────────────────────────────────────────────
  loadOrders(): void {
    if (!this.api.getToken()) return;
    this.ordersLoading = true;
    this.api.getOrders().subscribe({
      next: (res) => {
        const raw: ApiOrder[] = (res as any).data?.orders ?? [];
        this.ordersList = raw.map(o => ({
          id:                String(o.order_id),
          date:              new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          total:             o.total,
          status:            this._mapStatus(o.status),
          estimatedDelivery: o.delivered_at
            ? new Date(o.delivered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Pending',
          items: (o.items || []).map((i: any) => ({
            name:  i.name || 'Item',
            qty:   i.quantity,
            image: i.image_url || 'https://placehold.co/64x64/e2e8f0/475569?text=Item'
          }))
        }));

        this.totalOrders     = this.ordersList.length;
        this.activeOrders    = this.ordersList.filter(o => !['Delivered','Cancelled'].includes(o.status)).length;
        this.deliveredOrders = this.ordersList.filter(o => o.status === 'Delivered').length;
        this.ordersLoading   = false;
      },
      error: () => { this.ordersLoading = false; }
    });
  }

  private _mapStatus(raw: string): Order['status'] {
    switch (raw?.toLowerCase()) {
      case 'confirmed':         return 'Confirmed';
      case 'packed':            return 'Packed';
      case 'shipped':           return 'Shipped';
      case 'out_for_delivery':  return 'Out for Delivery';
      case 'delivered':         return 'Delivered';
      case 'cancelled':         return 'Cancelled';
      default:                  return 'Placed';
    }
  }

  get filteredOrders(): Order[] {
    const q = this.orderSearchQuery.toLowerCase().trim();
    if (!q) return this.ordersList;
    return this.ordersList.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q) ||
      o.items.some(i => i.name.toLowerCase().includes(q))
    );
  }

  cancelOrder(orderId: string): void {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    this.api.cancelOrder(parseInt(orderId)).subscribe({
      next: () => { this.showToastMessage('Order cancelled.', 'success'); this.loadOrders(); },
      error: (err: any) => this.showToastMessage(err.error?.message || 'Could not cancel order.', 'error')
    });
  }

  // ── Profile ───────────────────────────────────────────────────
  loadProfile(): void {
    if (!this.api.getToken()) { this.router.navigate(['/login']); return; }
    this.profileLoading = true;
    this.api.getProfile().subscribe({
      next: (res) => {
        this.profileForm  = { ...res.user };
        this.customerName = res.user.first_name || res.user.email || 'Customer';
        this.profileLoading = false;
      },
      error: (err) => {
        this.profileLoading = false;
        if (err.status === 401 || err.status === 403) {
          this.api.clearSession(); this.router.navigate(['/login']); return;
        }
        const stored = this.api.getStoredUser();
        if (stored) { this.profileForm = { ...stored }; this.customerName = stored.first_name || 'Customer'; }
        this.showToastMessage('Showing cached data — backend unreachable.', 'error');
      }
    });
  }

  onSaveProfile(): void {
    this.profileSaving = true;
    this.api.updateProfile(this.profileForm).subscribe({
      next: (res) => {
        this.profileSaving = false;
        this.customerName  = res.user.first_name || res.user.email || 'Customer';
        this.api.saveSession(this.api.getToken()!, res.user);
        this.showToastMessage('Profile updated successfully! ✓', 'success');
      },
      error: (err) => {
        this.profileSaving = false;
        this.showToastMessage(err.error?.message || 'Failed to save profile.', 'error');
      }
    });
  }

  // ── Addresses ─────────────────────────────────────────────────
  loadAddresses(): void {
    this.addressesLoading = true;
    this.api.getAddresses().subscribe({
      next: (res) => {
        this.addressList = (res as any).data?.addresses ?? [];
        this.addressesLoading = false;
      },
      error: () => { this.addressesLoading = false; }
    });
  }

  saveAddress(): void {
    if (!this.newAddress.address_line1) { this.showToastMessage('Address line 1 is required.', 'error'); return; }
    this.savingAddress = true;
    this.api.addAddress(this.newAddress).subscribe({
      next: () => {
        this.savingAddress = false;
        this.showAddressForm = false;
        this.newAddress = { label: 'Home', full_name: '', phone: '', address_line1: '', city: '', state: '', pincode: '', is_default: false };
        this.loadAddresses();
        this.showToastMessage('Address saved!', 'success');
      },
      error: (err) => {
        this.savingAddress = false;
        this.showToastMessage(err.error?.message || 'Failed to save address.', 'error');
      }
    });
  }

  setDefaultAddress(id: number): void {
    this.api.setDefaultAddress(id).subscribe({
      next: () => { this.loadAddresses(); this.showToastMessage('Default address updated.', 'success'); },
      error: () => this.showToastMessage('Failed to update default address.', 'error')
    });
  }

  deleteAddress(id: number): void {
    if (!confirm('Delete this address?')) return;
    this.api.deleteAddress(id).subscribe({
      next: () => { this.loadAddresses(); this.showToastMessage('Address deleted.', 'success'); },
      error: () => this.showToastMessage('Failed to delete address.', 'error')
    });
  }

  // ── Wishlist ──────────────────────────────────────────────────
  loadWishlist(): void {
    this.wishlistLoading = true;
    this.api.getWishlist().subscribe({
      next: (res) => {
        this.wishlistItems = (res as any).data?.items ?? [];
        this.wishlistLoading = false;
      },
      error: () => { this.wishlistLoading = false; }
    });
  }

  removeFromWishlist(productId: number): void {
    this.api.removeFromWishlist(productId).subscribe({
      next: () => { this.loadWishlist(); this.showToastMessage('Removed from wishlist.', 'success'); },
      error: () => this.showToastMessage('Failed to remove item.', 'error')
    });
  }

  // ── Notifications ─────────────────────────────────────────────
  loadNotifications(): void {
    if (!this.api.getToken()) return;
    this.notificationsLoading = true;
    this.api.getNotifications().subscribe({
      next: (res) => {
        this.notificationList = (res as any).data?.notifications ?? [];
        this.unreadCount      = (res as any).data?.unreadCount ?? 0;
        this.notificationsLoading = false;
      },
      error: () => { this.notificationsLoading = false; }
    });
  }

  markRead(id: number): void {
    this.api.markNotificationRead(id).subscribe({
      next: () => {
        this.notificationList = this.notificationList.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        );
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {}
    });
  }

  markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () => {
        this.notificationList = this.notificationList.map(n => ({ ...n, is_read: true }));
        this.unreadCount = 0;
        this.showToastMessage('All notifications marked as read.', 'success');
      },
      error: () => {}
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  logout(): void { this.api.clearSession(); this.router.navigate(['/login']); }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Delivered':        return 'status-delivered';
      case 'Shipped':          return 'status-shipped';
      case 'Out for Delivery': return 'status-out';
      case 'Packed':
      case 'Confirmed':
      case 'Placed':           return 'status-processing';
      case 'Cancelled':        return 'status-cancelled';
      default:                 return 'status-processing';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Delivered':        return 'check-circle';
      case 'Shipped':          return 'truck';
      case 'Out for Delivery': return 'map-pin';
      case 'Cancelled':        return 'x-circle';
      default:                 return 'package';
    }
  }

  private showToastMessage(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType    = type;
    this.showToast    = true;
    setTimeout(() => { this.showToast = false; }, 3500);
  }
}
