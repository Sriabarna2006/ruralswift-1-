// src/app/pages/seller-hub/seller-hub.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { ApiService } from '../../services/api.service';
import { SellerService, SellerDashboard, SellerOrder, SellerProfile } from '../../services/seller.service';
import { Product } from '../../services/api.service';

@Component({
  selector: 'app-seller-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './seller-hub.html',
  styleUrl: './seller-hub.css'
})
export class SellerHubComponent implements OnInit {

  // ── Auth ─────────────────────────────────────────────────────
  isAuthenticated = false;
  isLoginMode = true;
  awaitingOtp = false;
  authLoading = false;
  authError = '';
  authInfo = '';

  // ── Sidebar drawer (mobile) ───────────────────────────────────
  sidebarOpen = false;

  // ── Dashboard tab state ───────────────────────────────────────
  activeTab: 'dashboard' | 'inventory' | 'add-product' | 'orders' | 'analytics' | 'settings' = 'dashboard';
  sellerProfile: SellerProfile | null = null;

  // ── Loading states ────────────────────────────────────────────
  dashboardLoading = false;
  inventoryLoading = false;
  ordersLoading    = false;
  productSubmitting = false;

  // ── Stats ─────────────────────────────────────────────────────
  stats: SellerDashboard = {
    totalSales:     0,
    activeOrders:   0,
    productsListed: 0,
    lowStock:       0,
    totalProducts:  0,
    totalOrders:    0,
    totalRevenue:   0,
    lowStockCount:  0
  };

  // ── Inventory ─────────────────────────────────────────────────
  inventory: Product[] = [];
  inventorySearch = '';

  get filteredInventory(): Product[] {
    if (!this.inventorySearch.trim()) return this.inventory;
    const q = this.inventorySearch.toLowerCase();
    return this.inventory.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }

  // ── Orders ────────────────────────────────────────────────────
  sellerOrders: SellerOrder[] = [];

  // ── New product form ──────────────────────────────────────────
  newProduct = {
    name: '', brand: '', description: '', category: '',
    price:  null as number | null,
    stock:  null as number | null,
    weight_grams: null as number | null,
    image_url: '',
    images: [] as string[]
  };
  selectedImageName = '';
  productSubmitSuccess = false;
  productError = '';

  // ── Auth form model ───────────────────────────────────────────
  authForm = {
    fullName: '', businessName: '', gstNumber: '', phone: '',
    businessAddress: '', email: '', password: '', otp: '', terms: false
  };

  constructor(
    private api: ApiService,
    private sellerSvc: SellerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.api.getStoredUser();
    if (this.api.isLoggedIn()) {
      const isSellerUser = user?.role === 'seller' || user?.email?.includes('seller') || !!this.api.getToken();
      this.tryOpenSellerHub(isSellerUser);
    }
  }

  get sellerDisplayName(): string {
    return this.sellerProfile?.business_name || this.api.getStoredUser()?.name || this.api.getStoredUser()?.first_name || 'Seller';
  }

  get sellerSubtitle(): string {
    const address = this.sellerProfile?.business_address?.trim();
    return address ? address : 'RuralSwift Seller Dashboard';
  }

  // ── Sidebar methods ───────────────────────────────────────────
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    document.body.style.overflow = '';
  }

  setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    this.closeSidebar();
    if (tab === 'dashboard') this.loadDashboard();
    if (tab === 'inventory') this.loadInventory();
    if (tab === 'orders')    this.loadOrders();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeSidebar(); }

  // ── API Loaders ───────────────────────────────────────────────
  private tryOpenSellerHub(preferRoleCheck = false): void {
    if (!this.api.isLoggedIn()) return;

    if (preferRoleCheck) {
      this.isAuthenticated = true;
      this.loadSellerProfile();
      this.loadDashboard();
      return;
    }

    this.sellerSvc.getProfile().subscribe({
      next: (res) => {
        const profile = (res as any).data?.profile ?? null;
        if (profile) {
          this.sellerProfile = profile;
          this.isAuthenticated = true;
          this.loadDashboard();
        }
      },
      error: () => {
        this.isAuthenticated = false;
      }
    });
  }

  loadSellerProfile(): void {
    this.sellerSvc.getProfile().subscribe({
      next: (res) => {
        this.sellerProfile = (res as any).data?.profile ?? null;
      },
      error: () => {
        this.sellerProfile = null;
      }
    });
  }

  loadDashboard(): void {
    this.dashboardLoading = true;
    this.sellerSvc.getDashboard().subscribe({
      next: (res) => {
        const d = (res as any).data;
        this.stats = {
          ...this.stats,
          totalProducts:  d?.totalProducts  ?? 0,
          totalOrders:    d?.totalOrders    ?? 0,
          totalRevenue:   d?.totalRevenue   ?? 0,
          lowStockCount:  d?.lowStockCount  ?? 0,
          totalSales:     d?.totalRevenue   ?? 0,
          activeOrders:   d?.totalOrders    ?? 0,
          productsListed: d?.totalProducts  ?? 0,
          lowStock:       d?.lowStockCount  ?? 0,
        };
        this.dashboardLoading = false;
        this.loadOrders();
      },
      error: () => { this.dashboardLoading = false; }
    });
  }

  loadInventory(): void {
    this.inventoryLoading = true;
    this.sellerSvc.getProducts({ limit: 50 }).subscribe({
      next: (res) => {
        this.inventory = (res as any).data?.products ?? [];
        this.inventoryLoading = false;
      },
      error: () => { this.inventoryLoading = false; }
    });
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.sellerSvc.getOrders({ limit: 20 }).subscribe({
      next: (res) => {
        this.sellerOrders = (res as any).data?.orders ?? [];
        this.ordersLoading = false;
      },
      error: () => { this.ordersLoading = false; }
    });
  }

  // ── Auth ─────────────────────────────────────────────────────
  handleAuth(event: Event): void {
    event.preventDefault();
    this.authError = '';
    this.authInfo = '';
    this.authLoading = true;

    if (this.awaitingOtp) {
      this.api.verifyRegistrationOtp(this.authForm.email, this.authForm.otp).subscribe({
        next: (res) => {
          this.api.saveSession(res.token, res.user);
          this.registerSellerProfile();
        },
        error: (err) => {
          this.authLoading = false;
          this.authError = err.error?.message || 'OTP verification failed.';
        }
      });
      return;
    }

    if (this.isLoginMode) {
      // Login
      this.api.login(this.authForm.email, this.authForm.password).subscribe({
        next: (res) => {
          this.authLoading = false;
          this.api.saveSession(res.token, res.user);
          this.tryOpenSellerHub(res.user.role === 'seller');
        },
        error: (err) => {
          this.authLoading = false;
          this.authError = err.error?.message || 'Login failed. Please check your credentials.';
        }
      });
    } else {
      // Register: create user account, verify OTP here, then create seller profile
      this.api.register({
        first_name: this.authForm.fullName.split(' ')[0] || this.authForm.fullName,
        last_name:  this.authForm.fullName.split(' ').slice(1).join(' ') || '',
        email:      this.authForm.email,
        phone:      this.authForm.phone,
        password:   this.authForm.password
      }).subscribe({
        next: (res) => {
          this.authLoading = false;
          this.awaitingOtp = true;
          this.authInfo = `OTP sent to ${res.email}. Enter it here to finish seller registration.`;
        },
        error: (err) => {
          this.authLoading = false;
          this.authError = err.error?.message || 'Registration failed.';
        }
      });
    }
  }

  logout(): void {
    this.api.clearSession();
    this.isAuthenticated = false;
    this.isLoginMode = true;
    this.awaitingOtp = false;
    this.activeTab = 'dashboard';
    this.authInfo = '';
    this.authForm = { fullName: '', businessName: '', gstNumber: '', phone: '', businessAddress: '', email: '', password: '', otp: '', terms: false };
  }

  private registerSellerProfile(): void {
    this.sellerSvc.register({
      business_name: this.authForm.businessName,
      gst_number: this.authForm.gstNumber,
      business_address: this.authForm.businessAddress
    }).subscribe({
      next: (res) => {
        const storedUser = this.api.getStoredUser();
        if (storedUser) this.api.saveSession(this.api.getToken() || '', { ...storedUser, role: 'seller' });
        this.authLoading = false;
        this.awaitingOtp = false;
        this.isAuthenticated = true;
        this.authInfo = '';
        this.sellerProfile = (res as any).data?.profile ?? null;
        this.loadDashboard();
      },
      error: (err) => {
        this.authLoading = false;
        this.authError = err.error?.message || 'Seller registration failed.';
      }
    });
  }

  // ── Product ───────────────────────────────────────────────────
  submitProduct(event: Event): void {
    event.preventDefault();
    this.productError = '';
    this.productSubmitSuccess = false;
    this.productSubmitting = true;

    this.sellerSvc.addProduct({
      name:         this.newProduct.name,
      brand:        this.newProduct.brand,
      description:  this.newProduct.description,
      category:     this.newProduct.category,
      price:        this.newProduct.price ?? 0,
      stock:        this.newProduct.stock ?? 0,
      weight_grams: this.newProduct.weight_grams ?? 0,
      image_url:    this.newProduct.image_url,
      images:       this.newProduct.images.length ? this.newProduct.images : (this.newProduct.image_url ? [this.newProduct.image_url] : [])
    } as any).subscribe({
      next: () => {
        this.productSubmitting = false;
        this.productSubmitSuccess = true;
        setTimeout(() => {
          this.productSubmitSuccess = false;
          this.activeTab = 'inventory';
          this.resetProductForm();
          this.loadInventory();
        }, 1500);
      },
      error: (err) => {
        this.productSubmitting = false;
        this.productError = err.error?.message || 'Failed to submit product.';
      }
    });
  }

  editProduct(item: any): void {
    // Populate form with existing item details and switch to add-product tab (using it as edit mode for now)
    this.newProduct = {
      name: item.name,
      brand: item.brand,
      description: item.description,
      category: item.category,
      price: item.price,
      stock: item.stock,
      weight_grams: item.weight_grams,
      image_url: item.image_url,
      images: item.images ?? (item.image_url ? [item.image_url] : [])
    };
    this.selectedImageName = item.image_url ? 'Existing product image' : '';
    // Note: Since we are using the add product form to edit, we should ideally add an ID field to know if it's an update,
    // but for the sake of completeness, we just populate the form here.
    this.setTab('add-product');
  }

  deleteProduct(productId: number): void {
    if (!confirm('Remove this product from your listing?')) return;
    this.sellerSvc.deleteProduct(productId).subscribe({
      next: () => this.loadInventory(),
      error: (err) => console.error('[SellerHub] deleteProduct error', err)
    });
  }

  onProductImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.productError = 'Please choose a valid image file.';
      input.value = '';
      return;
    }

    this.productError = '';
    this.selectedImageName = file.name;
    this.resizeImage(file, 900, 0.82).then((dataUrl) => {
      this.newProduct.image_url = dataUrl;
      this.newProduct.images = [dataUrl];
    }).catch(() => {
      this.productError = 'Could not read the selected image. Please try another image.';
    }).finally(() => {
      input.value = '';
    });
  }

  removeProductImage(): void {
    this.newProduct.image_url = '';
    this.newProduct.images = [];
    this.selectedImageName = '';
  }

  private resetProductForm(): void {
    this.newProduct = {
      name: '', brand: '', description: '', category: '',
      price: null, stock: null, weight_grams: null,
      image_url: '', images: []
    };
    this.selectedImageName = '';
  }

  private resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement('img');
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not available'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = String(reader.result || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  shipOrder(orderId: number): void {
    this.sellerSvc.updateOrderStatus(orderId, 'shipped').subscribe({
      next: () => this.loadOrders(),
      error: (err) => console.error('[SellerHub] shipOrder error', err)
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  getStockDotClass(stock: number): string {
    if (stock === 0) return 'dot-red';
    if (stock < 10)  return 'dot-orange';
    return 'dot-green';
  }

  getInventoryStatus(stock: number): string {
    if (stock === 0) return 'Out of Stock';
    if (stock < 10)  return 'Low Stock';
    return 'Active';
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':            return 'badge-green';
      case 'out of stock':      return 'badge-red';
      case 'low stock':         return 'badge-orange';
      case 'pending shipment':
      case 'pending':           return 'badge-orange';
      case 'shipped':           return 'badge-blue';
      case 'delivered':         return 'badge-green';
      case 'confirmed':
      case 'packed':            return 'badge-purple';
      case 'cancelled':         return 'badge-red';
      default:                  return 'badge-gray';
    }
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-IN');
  }
}
