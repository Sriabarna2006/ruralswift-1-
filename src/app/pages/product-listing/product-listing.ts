// src/app/pages/product-listing/product-listing.ts
import {
  Component, OnInit, ChangeDetectionStrategy, inject, signal, ChangeDetectorRef
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Product } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-listing.html',
  styleUrl: './product-listing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListingComponent implements OnInit {
  private api    = inject(ApiService);
  private cart   = inject(CartService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  public imageKit = inject(ImageKitService);
  public readonly placeholderImage = this.imageKit.placeholder();
  public products   = signal<Product[]>([]);
  public isLoading  = signal(true);
  public totalCount = signal(0);
  public currentPage = signal(1);
  public totalPages  = signal(1);
  private cdr = inject(ChangeDetectorRef);

  public searchQuery       = signal('');
  public selectedCategory  = signal('All');
  public selectedSort      = signal('default');
  public showFilters       = signal(false);
  public priceMin          = signal<number | null>(null);
  public priceMax          = signal<number | null>(null);

  public readonly categories = [
    'All', 'Farming Equipment', 'Seeds & Fertilizers', 'Groceries',
    'Medicine & Health', 'Electronics', 'Home & Kitchen', 'Livestock Care',
    'Clothing', 'Tools & Hardware',
  ];

  public readonly sortOptions = [
    { value: 'default', label: 'Relevance' },
    { value: 'low',     label: 'Price: Low to High' },
    { value: 'high',    label: 'Price: High to Low' },
    { value: 'best',    label: 'Best Rated' },
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['search'])   this.searchQuery.set(params['search']);
      if (params['category']) this.selectedCategory.set(params['category']);
      this.currentPage.set(1);
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.isLoading.set(true);
    const filters: Parameters<typeof this.api.getProducts>[0] = {
      page: this.currentPage(),
      limit: 24,
    };
    const q = this.searchQuery().trim();
    const cat = this.selectedCategory();
    if (q)          filters.search   = q;
    if (cat !== 'All') filters.category = cat;
    if (this.priceMin()) filters.minPrice = this.priceMin()!;
    if (this.priceMax()) filters.maxPrice = this.priceMax()!;

    this.api.getProducts(filters).subscribe({
      next: (res) => {
        let items = res.data?.products ?? [];
        items = this.applySortLocal(items);
        this.products.set(items);
        this.totalCount.set(res.data?.pagination?.total ?? items.length);
        this.totalPages.set(res.data?.pagination?.totalPages ?? 1);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.toast.error('Could not load products. Please try again.');
      }
    });
  }

  private applySortLocal(items: Product[]): Product[] {
    switch (this.selectedSort()) {
      case 'low':  return [...items].sort((a, b) => a.price - b.price);
      case 'high': return [...items].sort((a, b) => b.price - a.price);
      case 'best': return [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default:     return items;
    }
  }

  onSortChange(val: string): void {
    this.selectedSort.set(val);
    this.products.update(p => this.applySortLocal(p));
  }

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
    this.loadProducts();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadProducts();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
    this.cart.addItem(product.product_id);
    this.toast.success(`${product.name} added to cart`);
  }

  goToProduct(id: number): void {
    this.router.navigate(['/product-details', id]);
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
    this.priceMin.set(null);
    this.priceMax.set(null);
    this.selectedSort.set('default');
    this.loadProducts();
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  }

  discount(price: number, mrp: number): number {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  get pageRange(): number[] {
    const total = this.totalPages();
    const cur   = this.currentPage();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
      range.push(i);
    }
    return range;
  }
}
