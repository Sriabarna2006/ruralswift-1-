// src/app/pages/home/home.ts
import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  inject, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ApiService, Product } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  private api      = inject(ApiService);
  private cart     = inject(CartService);
  private toast    = inject(ToastService);
  private router   = inject(Router);
  private imageKit = inject(ImageKitService);

  // Hero carousel state
  public currentSlide = signal(0);
  public activeHeroSlide = computed(() => this.heroSlides[this.currentSlide()] ?? this.heroSlides[0]);
  private carouselTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly carouselDelay = 5000;

  // Products for Horizontal Scrolls
  public computersProducts = signal<Product[]>([]);
  public kitchenProducts   = signal<Product[]>([]);
  public smallBizProducts  = signal<Product[]>([]);
  public isLoading         = signal(true);

  public readonly placeholderImage = this.imageKit.placeholder('product');

  public heroSlides = [
    {
      image: this.imageKit.resolve('hero-cookware.webp', 'hero'),
      link: 'Home & Kitchen'
    },
    {
      image: this.imageKit.resolve('hero-electronics.webp', 'hero'),
      link: 'Electronics'
    },
    {
      image: this.imageKit.resolve('hero-fashion.webp', 'hero'),
      link: 'Clothing'
    },
  ];

  public quadCards = [
    {
      title: 'Up to 60% off | Cookware, kitchen tool & more',
      category: 'Home & Kitchen',
      images: [
        this.imageKit.resolve('cookware-1.webp', 'category'),
        this.imageKit.resolve('cookware-2.webp', 'category'),
        this.imageKit.resolve('cookware-3.webp', 'category'),
        this.imageKit.resolve('cookware-4.webp', 'category'),
      ],
      linkText: 'See all'
    },
    {
      title: 'Best Sellers in Beauty',
      category: 'Medicine & Health',
      images: [
        this.imageKit.resolve('beauty-1.webp', 'category'),
        this.imageKit.resolve('beauty-2.webp', 'category'),
        this.imageKit.resolve('beauty-3.webp', 'category'),
        this.imageKit.resolve('beauty-4.webp', 'category'),
      ],
      linkText: 'See more'
    },
    {
      title: '50 - 80% off | Sports, outdoor & more',
      category: 'Tools & Hardware',
      images: [
        this.imageKit.resolve('sports-1.webp', 'category'),
        this.imageKit.resolve('sports-2.webp', 'category'),
        this.imageKit.resolve('sports-3.webp', 'category'),
        this.imageKit.resolve('sports-4.webp', 'category'),
      ],
      linkText: 'See all deals'
    },
    {
      title: "Minimum 50% off | Men's clothing",
      category: 'Clothing',
      images: [
        this.imageKit.resolve('mens-1.webp', 'category'),
        this.imageKit.resolve('mens-2.webp', 'category'),
        this.imageKit.resolve('mens-3.webp', 'category'),
        this.imageKit.resolve('mens-4.webp', 'category'),
      ],
      linkText: 'See all deals'
    }
  ];

  // Currency formatter
  public fmt = (n: number): string =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

  public discount(price: number, mrp: number): number {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  ngOnInit(): void {
    this.preloadHeroImage(this.heroSlides[0]?.image);
    this.restartCarousel();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    if (this.carouselTimer) clearTimeout(this.carouselTimer);
  }

  private restartCarousel(): void {
    if (this.carouselTimer) clearTimeout(this.carouselTimer);

    this.carouselTimer = setTimeout(() => {
      this.currentSlide.update(s => (s + 1) % this.heroSlides.length);
      this.restartCarousel();
    }, this.carouselDelay);
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    this.restartCarousel();
  }

  private preloadHeroImage(src?: string): void {
  }

  private loadProducts(): void {
    // Fetch 3 different categories for the horizontal rows in parallel
    forkJoin({
      computers: this.api.getProducts({ category: 'Electronics', limit: 10 }),
      kitchen:   this.api.getProducts({ category: 'Home & Kitchen', limit: 10 }),
      smallBiz:  this.api.getProducts({ category: 'Farming Equipment', limit: 10 }),
      fallback:  this.api.getProducts({ limit: 10 }) // In case some categories are empty
    }).subscribe({
      next: (res) => {
        // If a specific category has no products, use the fallback list to ensure UI isn't empty
        const fback = res.fallback.data?.products ?? [];
        
        const comp = res.computers.data?.products ?? [];
        this.computersProducts.set(comp.length ? comp : fback);
        
        const kitch = res.kitchen.data?.products ?? [];
        this.kitchenProducts.set(kitch.length ? kitch : fback);
        
        const small = res.smallBiz.data?.products ?? [];
        this.smallBizProducts.set(small.length ? small : fback);
        
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
    this.cart.addItem(product.product_id);
    this.toast.success(`${product.name} added to cart`);
  }

  goToProduct(id: number): void {
    this.router.navigate(['/product-details', id]);
  }

  shopCategory(category: string): void {
    this.router.navigate(['/products'], { queryParams: { category } });
  }
}
