import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgClass, NgIf, DecimalPipe } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar';
import { ApiService, Product } from '../../services/api.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgFor, NgClass, NgIf, NavbarComponent, DecimalPipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  currentSlide = 0;
  private carouselTimer: any;

  // Live products from DB
  featuredProducts: Product[] = [];
  productsLoading = false;

  heroSlides = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=2071',
      alt: 'Fast Delivery to Every Village'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1586771107445-d3af9e150123?auto=format&fit=crop&q=80&w=2070',
      alt: 'Farming Essentials Sale'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1974',
      alt: 'Fresh Groceries Daily'
    }
  ];

  categoryCards = [
    { title: 'Farming Tools & Machinery', img: 'https://images.unsplash.com/photo-1592982537447-6f29efeb063b?w=500&q=80', link: '/products?category=Farming+Equipment' },
    { title: 'Seeds & Fertilizers',       img: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=500&q=80', link: '/products?category=Seeds+%26+Fertilizers' },
    { title: 'Fresh Local Produce',       img: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80', link: '/products?category=Groceries' },
    { title: 'Livestock Care',            img: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&q=80', link: '/products?category=Livestock+Care' }
  ];

  constructor(private api: ApiService, private cart: CartService) {}

  ngOnInit(): void {
    this.startCarousel();
    this.loadFeaturedProducts();
    // Load cart if logged in
    this.cart.load();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  loadFeaturedProducts(): void {
    this.productsLoading = true;
    this.api.getProducts({ limit: 12, page: 1 }).subscribe({
      next: (res) => {
        this.featuredProducts = (res as any).data?.products ?? [];
        this.productsLoading  = false;
      },
      error: () => {
        this.featuredProducts = [];
        this.productsLoading  = false;
      }
    });
  }

  addToCart(product: Product): void {
    this.cart.addItem(product.product_id, 1);
  }

  getDiscount(price: number, mrp: number): number {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  fallbackImg(event: Event): void {
    (event.target as HTMLImageElement).src = 'https://placehold.co/300x300/f1f5f9/475569?text=Product';
  }

  private startCarousel(): void {
    this.carouselTimer = setInterval(() => { this.nextSlide(); }, 4000);
  }

  private stopCarousel(): void {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.heroSlides.length) % this.heroSlides.length;
  }

  goToSlide(i: number): void {
    this.currentSlide = i;
  }
}