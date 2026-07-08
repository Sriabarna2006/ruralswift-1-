// src/app/pages/seller-hub/seller-hub.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal, HostListener
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SellerService, SellerDashboard, SellerOrder, SellerProfile } from '../../services/seller.service';
import { Product } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { ImageKitService } from '../../services/imagekit.service';

type SellerTab = 'dashboard' | 'inventory' | 'add-product' | 'orders' | 'settings';

@Component({
  selector: 'app-seller-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seller-hub.html',
  styleUrl: './seller-hub.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerHubComponent implements OnInit {
  private api       = inject(ApiService);
  private sellerSvc = inject(SellerService);
  private toast     = inject(ToastService);
  private router    = inject(Router);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();

  // Auth
  public isAuthenticated  = signal(false);
  public isLoginMode      = signal(true);
  public awaitingOtp      = signal(false);
  public authLoading      = signal(false);
  public authError        = signal('');
  public authInfo         = signal('');

  // UI
  public activeTab        = signal<SellerTab>('dashboard');
  public sidebarOpen      = signal(false);

  // Data
  public sellerProfile    = signal<SellerProfile | null>(null);
  public stats            = signal<SellerDashboard>({
    totalSales: 0, activeOrders: 0, productsListed: 0, lowStock: 0,
    totalProducts: 0, totalOrders: 0, totalRevenue: 0, lowStockCount: 0,
  });
  public inventory        = signal<Product[]>([]);
  public sellerOrders     = signal<SellerOrder[]>([]);
  public inventorySearch  = signal('');

  // Loading
  public dashLoading      = signal(false);
  public invLoading       = signal(false);
  public ordersLoading    = signal(false);
  public productSaving    = signal(false);

  // Product form
  public newProduct = {
    name: '', brand: '', description: '', category: '',
    price: null as number | null, stock: null as number | null,
    weight_grams: null as number | null, image_url: '', images: [] as string[]
  };
  public selectedImageName = signal('');
  public productError      = signal('');

  // Auth form
  authForm = {
    fullName: '', businessName: '', gstNumber: '', phone: '',
    businessAddress: '', email: '', password: '', otp: '', terms: false
  };

  public readonly tabs: { id: SellerTab; label: string; icon: string }[] = [
    { id: 'dashboard',   label: 'Dashboard',   icon: '📊' },
    { id: 'inventory',   label: 'Inventory',   icon: '📦' },
    { id: 'add-product', label: 'Add Product', icon: '➕' },
    { id: 'orders',      label: 'Orders',      icon: '🛒' },
    { id: 'settings',    label: 'Settings',    icon: '⚙️' },
  ];

  get filteredInventory(): Product[] {
    const q = this.inventorySearch().toLowerCase().trim();
    if (!q) return this.inventory();
    return this.inventory().filter(i =>
      i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    if (this.api.isLoggedIn()) {
      this.tryOpenSellerHub();
    }
  }

  private tryOpenSellerHub(): void {
    this.sellerSvc.getProfile().subscribe({
      next: (res) => {
        const profile = (res as any).data?.profile ?? null;
        if (profile) {
          this.sellerProfile.set(profile);
          this.isAuthenticated.set(true);
          this.loadDashboard();
        }
      },
      error: () => this.isAuthenticated.set(false)
    });
  }

  handleAuth(event: Event): void {
    event.preventDefault();
    this.authError.set('');
    this.authInfo.set('');
    this.authLoading.set(true);

    if (this.awaitingOtp()) {
      this.api.verifyRegistrationOtp(this.authForm.email, this.authForm.otp).subscribe({
        next: (res) => {
          this.api.saveSession(res.token, res.user);
          this.registerSellerProfile();
        },
        error: (err) => {
          this.authLoading.set(false);
          this.authError.set(err.error?.message || 'OTP verification failed.');
        }
      });
      return;
    }

    if (this.isLoginMode()) {
      this.api.login({ email: this.authForm.email, password: this.authForm.password }).subscribe({
        next: (res) => {
          this.authLoading.set(false);
          this.api.saveSession(res.token, res.user);
          this.tryOpenSellerHub();
        },
        error: (err) => {
          this.authLoading.set(false);
          this.authError.set(err.error?.message || 'Invalid credentials.');
        }
      });
    } else {
      const nameParts = this.authForm.fullName.trim().split(' ');
      this.api.register({
        first_name: nameParts[0] || '',
        last_name:  nameParts.slice(1).join(' ') || '',
        email:      this.authForm.email,
        phone:      this.authForm.phone,
        password:   this.authForm.password,
      }).subscribe({
        next: (res) => {
          this.authLoading.set(false);
          this.awaitingOtp.set(true);
          this.authInfo.set(`OTP sent to ${res.email}. Verify to complete seller registration.`);
        },
        error: (err) => {
          this.authLoading.set(false);
          this.authError.set(err.error?.message || 'Registration failed.');
        }
      });
    }
  }

  private registerSellerProfile(): void {
    this.sellerSvc.register({
      business_name:    this.authForm.businessName,
      gst_number:       this.authForm.gstNumber,
      business_address: this.authForm.businessAddress,
    }).subscribe({
      next: (res) => {
        const stored = this.api.getStoredUser();
        if (stored) this.api.saveSession(this.api.getToken() || '', { ...stored, role: 'seller' });
        this.sellerProfile.set((res as any).data?.profile ?? null);
        this.isAuthenticated.set(true);
        this.authLoading.set(false);
        this.awaitingOtp.set(false);
        this.authInfo.set('');
        this.loadDashboard();
      },
      error: (err) => {
        this.authLoading.set(false);
        this.authError.set(err.error?.message || 'Seller setup failed.');
      }
    });
  }

  logout(): void {
    this.api.clearSession();
    this.isAuthenticated.set(false);
    this.isLoginMode.set(true);
    this.awaitingOtp.set(false);
    this.authError.set('');
    this.authInfo.set('');
    this.activeTab.set('dashboard');
    this.authForm = { fullName: '', businessName: '', gstNumber: '', phone: '', businessAddress: '', email: '', password: '', otp: '', terms: false };
  }

  setTab(tab: SellerTab): void {
    this.activeTab.set(tab);
    this.sidebarOpen.set(false);
    document.body.style.overflow = '';
    if (tab === 'dashboard') this.loadDashboard();
    if (tab === 'inventory')  this.loadInventory();
    if (tab === 'orders')     this.loadOrders();
  }

  toggleSidebar(): void {
    const open = !this.sidebarOpen();
    this.sidebarOpen.set(open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sidebarOpen.set(false);
    document.body.style.overflow = '';
  }

  loadDashboard(): void {
    this.dashLoading.set(true);
    this.sellerSvc.getDashboard().subscribe({
      next: (res) => {
        const d = (res as any).data ?? {};
        this.stats.set({
          totalProducts:  d.totalProducts  ?? 0,
          totalOrders:    d.totalOrders    ?? 0,
          totalRevenue:   d.totalRevenue   ?? 0,
          lowStockCount:  d.lowStockCount  ?? 0,
          totalSales:     d.totalRevenue   ?? 0,
          activeOrders:   d.totalOrders    ?? 0,
          productsListed: d.totalProducts  ?? 0,
          lowStock:       d.lowStockCount  ?? 0,
        });
        this.dashLoading.set(false);
        this.loadOrders();
      },
      error: () => this.dashLoading.set(false)
    });
  }

  loadInventory(): void {
    this.invLoading.set(true);
    this.sellerSvc.getProducts({ limit: 50 }).subscribe({
      next: (res) => {
        this.inventory.set((res as any).data?.products ?? []);
        this.invLoading.set(false);
      },
      error: () => this.invLoading.set(false)
    });
  }

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.sellerSvc.getOrders({ limit: 20 }).subscribe({
      next: (res) => {
        this.sellerOrders.set((res as any).data?.orders ?? []);
        this.ordersLoading.set(false);
      },
      error: () => this.ordersLoading.set(false)
    });
  }

  submitProduct(event: Event): void {
    event.preventDefault();
    this.productError.set('');
    this.productSaving.set(true);

    this.sellerSvc.addProduct({
      ...this.newProduct,
      price:        this.newProduct.price ?? 0,
      stock:        this.newProduct.stock ?? 0,
      weight_grams: this.newProduct.weight_grams ?? 0,
      images: this.newProduct.images.length ? this.newProduct.images
                : (this.newProduct.image_url ? [this.newProduct.image_url] : []),
    } as any).subscribe({
      next: () => {
        this.productSaving.set(false);
        this.toast.success('Product listed successfully!');
        this.resetProductForm();
        this.setTab('inventory');
        this.loadInventory();
      },
      error: (err) => {
        this.productSaving.set(false);
        this.productError.set(err.error?.message || 'Failed to add product.');
      }
    });
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.productError.set('Please choose a valid image file.');
      return;
    }
    this.selectedImageName.set(file.name);
    this.resizeImage(file, 900, 0.82).then(url => {
      this.newProduct.image_url = url;
      this.newProduct.images = [url];
    }).catch(() => this.productError.set('Could not read image.'));
    (event.target as HTMLInputElement).value = '';
  }

  removeImage(): void {
    this.newProduct.image_url = '';
    this.newProduct.images = [];
    this.selectedImageName.set('');
  }

  deleteProduct(id: number): void {
    if (!confirm('Remove this product from your listing?')) return;
    this.sellerSvc.deleteProduct(id).subscribe({
      next: () => { this.toast.success('Product removed.'); this.loadInventory(); },
      error: () => this.toast.error('Failed to remove product.')
    });
  }

  shipOrder(orderId: number): void {
    this.sellerSvc.updateOrderStatus(orderId, 'shipped').subscribe({
      next: () => { this.toast.success('Order marked as shipped.'); this.loadOrders(); },
      error: () => this.toast.error('Failed to update order status.')
    });
  }

  private resetProductForm(): void {
    this.newProduct = {
      name: '', brand: '', description: '', category: '',
      price: null, stock: null, weight_grams: null, image_url: '', images: []
    };
    this.selectedImageName.set('');
    this.productError.set('');
  }

  private resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width  = Math.max(1, Math.round(img.width  * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = String(reader.result || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getStockClass(stock: number): string {
    if (stock === 0) return 'stock--out';
    if (stock < 10)  return 'stock--low';
    return 'stock--ok';
  }

  getStatusBadge(status: string): string {
    const m: Record<string, string> = {
      active: 'badge--green', pending: 'badge--orange', shipped: 'badge--blue',
      delivered: 'badge--green', cancelled: 'badge--red', confirmed: 'badge--purple',
    };
    return m[status?.toLowerCase()] ?? 'badge--gray';
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }

  get sellerName(): string {
    return this.sellerProfile()?.business_name ?? this.api.getStoredUser()?.first_name ?? 'Seller';
  }
}
