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
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1920&h=600&fit=crop&q=80',
      link: 'Home & Kitchen'
    },
    {
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&h=600&fit=crop&q=80',
      link: 'Electronics'
    },
    {
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&h=600&fit=crop&q=80',
      link: 'Clothing'
    },
  ];

  public quadCards = [
    {
      title: 'Up to 60% off | Cookware, kitchen tool & more',
      category: 'Home & Kitchen',
      images: [
        'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=400&fit=crop&q=80',
      ],
      linkText: 'See all'
    },
    {
      title: 'Best Sellers in Seeds & Fertilizers',
      category: 'Seeds & Fertilizers',
      images: [
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400&h=400&fit=crop&q=80',
      ],
      linkText: 'See more'
    },
    {
      title: '50 - 80% off | Tools, hardware & more',
      category: 'Tools & Hardware',
      images: [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=400&fit=crop&q=80',
      ],
      linkText: 'See all deals'
    },
    {
      title: 'Best Farming Equipment | Tractor, ploughs & more',
      category: 'Farming Equipment',
      images: [
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400&h=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=400&h=400&fit=crop&q=80',
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
