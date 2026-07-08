import { Injectable } from '@angular/core';

type ImageKind = 'hero' | 'category' | 'product' | 'cart' | 'wishlist' | 'profile' | 'seller' | 'logo' | 'placeholder';

@Injectable({
  providedIn: 'root'
})
export class ImageKitService {
  private readonly cdnRoot = 'https://ik.imagekit.io/pswnvzqkb7';

  private readonly transformations: Record<ImageKind, string> = {
    hero: 'tr=w-1920,h-600,f-auto,q-auto',
    category: 'tr=w-400,h-400,f-auto,q-auto',
    product: 'tr=w-600,h-600,f-auto,q-auto',
    cart: 'tr=w-200,h-200,f-auto,q-auto',
    wishlist: 'tr=w-250,h-250,f-auto,q-auto',
    profile: 'tr=w-300,h-300,f-auto,q-auto',
    seller: 'tr=w-300,h-300,f-auto,q-auto',
    logo: 'tr=h-60,f-auto,q-auto',
    placeholder: 'tr=w-400,h-400,f-auto,q-auto',
  };

  resolve(filename?: string | null, kind: ImageKind = 'product'): string {
    if (!filename) {
      return this.placeholder(kind);
    }

    if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('data:')) {
      if (filename.startsWith(this.cdnRoot)) {
          const base = filename.split('?')[0];
          return `${base}?${this.transformations[kind] ?? this.transformations.product}`;
      }
      return filename;
    }

    const normalized = this.normalizePath(filename);
    const tr = this.transformations[kind] ?? this.transformations.product;
    return `${this.cdnRoot}/${normalized}?${tr}`;
  }

  placeholder(kind: ImageKind = 'placeholder'): string {
    return this.resolve('placeholder.webp', kind);
  }

  private normalizePath(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1];
  }
}
