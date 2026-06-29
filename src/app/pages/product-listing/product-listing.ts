import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-listing.html',
  styleUrls: ['./product-listing.css']
})
export class ProductListingComponent implements OnInit {

  products: any[] = [];
  filteredProducts: any[] = [];

  categories = [
    'All',
    'Fashion',
    'Men',
    'Kids',
    'Grocery',
    'Medicine',
    'Electronics',
    'Beauty',
    'Home'
  ];

  selectedCategory = 'All';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.products = this.productService.getProducts();
    this.filteredProducts = [...this.products];
  }

  filterCategory(category: string) {
    this.selectedCategory = category;

    if (category === 'All') {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(
        p => p.category === category
      );
    }
  }

  sortProducts(event: Event) {

    const value =
      (event.target as HTMLSelectElement).value;

    switch (value) {

      case 'low':
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;

      case 'high':
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;

      case 'best':
        this.filteredProducts.sort((a, b) => b.rating - a.rating);
        break;

      default:
        this.filterCategory(this.selectedCategory);
    }
  }
}