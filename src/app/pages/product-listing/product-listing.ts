// src/app/pages/product-listing/product-listing.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Product } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { NavbarComponent } from '../../components/navbar/navbar';

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent],
  templateUrl: './product-listing.html',
  styleUrls: ['./product-listing.css']
})
export class ProductListingComponent implements OnInit {

  products:         Product[] = [];
  filteredProducts: Product[] = [];
  loading   = false;
  error     = '';
  searchQuery = '';
  selectedCategory = 'All';
  sortBy = 'default';
  addingToCart: Set<number> = new Set();
  toastMsg = '';
  showToast = false;

  currentPage  = 1;
  totalPages   = 1;
  totalCount   = 0;

  categories = [
    'All', 'Farming Equipment', 'Seeds & Fertilizers', 'Groceries',
    'Medicine & Health', 'Electronics', 'Home & Kitchen', 'Livestock Care'
  ];

  constructor(
    private api: ApiService,
    private cart: CartService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize cart
    this.cart.load();

    // Read query params for search
    this.route.queryParams.subscribe(params => {
      if (params['q']) this.searchQuery = params['q'];
      if (params['category']) this.selectedCategory = params['category'];
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.error   = '';

    const filters: any = { page: this.currentPage, limit: 24 };
    if (this.searchQuery.trim())          filters.search   = this.searchQuery.trim();
    if (this.selectedCategory !== 'All')  filters.category = this.selectedCategory;

    this.api.getProducts(filters).subscribe({
      next: (res) => {
        this.products         = (res as any).data?.products ?? [];
        this.filteredProducts = [...this.products];
        this.totalPages       = (res as any).data?.pagination?.totalPages ?? 1;
        this.totalCount       = (res as any).data?.pagination?.total ?? this.products.length;
        this.loading          = false;
        this.applySort();
      },
      error: () => {
        this.loading = false;
        this.error   = 'Could not load products. Please check your connection or try again.';
      }
    });
  }

  filterCategory(category: string): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.loadProducts();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  sortProducts(event: Event): void {
    this.sortBy = (event.target as HTMLSelectElement).value;
    this.applySort();
  }

  applySort(): void {
    switch (this.sortBy) {
      case 'low':  this.filteredProducts = [...this.products].sort((a, b) => a.price - b.price); break;
      case 'high': this.filteredProducts = [...this.products].sort((a, b) => b.price - a.price); break;
      case 'best': this.filteredProducts = [...this.products].sort((a, b) => b.rating - a.rating); break;
      default:     this.filteredProducts = [...this.products];
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addToCart(product: Product): void {
    this.addingToCart.add(product.product_id);
    this.cart.addItem(product.product_id, 1);
    setTimeout(() => {
      this.addingToCart.delete(product.product_id);
      this._toast(`"${product.name}" added to cart!`);
    }, 600);
  }

  isAddingToCart(id: number): boolean { return this.addingToCart.has(id); }

  getDiscount(price: number, mrp: number): number {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  fallbackImg(event: Event): void {
    (event.target as HTMLImageElement).src = 'https://placehold.co/300x300/f1f5f9/475569?text=Product';
  }

  private _toast(msg: string): void {
    this.toastMsg  = msg;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 2500);
  }
}