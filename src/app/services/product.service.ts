import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  products = [
    {
      id: 1,
      name: 'Cotton Kurti',
      category: 'Fashion',
      price: 799,
      oldPrice: 999,
      image: 'assets/products/kurti.jpg',
      offer: '20% OFF',
      rating: 4.8
    },
    {
      id: 2,
      name: 'Silk Saree',
      category: 'Fashion',
      price: 1299,
      oldPrice: 1699,
      image: 'assets/products/saree.jpg',
      offer: 'NEW',
      rating: 4.9
    },
    {
      id: 3,
      name: 'Casual Shirt',
      category: 'Men',
      price: 699,
      oldPrice: 899,
      image: 'assets/products/shirt.jpg',
      offer: '15% OFF',
      rating: 4.5
    },
    {
      id: 4,
      name: 'Running Shoes',
      category: 'Fashion',
      price: 999,
      oldPrice: 1199,
      image: 'assets/products/shoes.jpg',
      offer: 'Best Seller',
      rating: 4.7
    },
    {
      id: 5,
      name: 'Premium Rice',
      category: 'Grocery',
      price: 650,
      oldPrice: 750,
      image: 'assets/products/rice.jpg',
      offer: 'Fresh',
      rating: 4.9
    },
    {
      id: 6,
      name: 'HP Laptop',
      category: 'Electronics',
      price: 54999,
      oldPrice: 58999,
      image: 'assets/products/laptop.jpg',
      offer: '10% OFF',
      rating: 4.8
    }
  ];

  getProducts() {
    return this.products;
  }

  getProductById(id: number) {
    return this.products.find(product => product.id === id);
  }
  

}