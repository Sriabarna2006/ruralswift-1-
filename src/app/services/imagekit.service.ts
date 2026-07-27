import { Injectable } from '@angular/core';

type ImageKind = 'hero' | 'category' | 'product' | 'cart' | 'wishlist' | 'profile' | 'seller' | 'logo' | 'placeholder';

/**
 * Category → reliable Unsplash fallback image (used when ImageKit file doesn't exist)
 */
const CATEGORY_FALLBACKS: Record<string, string> = {
  'farming equipment':   'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=600&fit=crop&q=80',
  'seeds & fertilizers': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=600&fit=crop&q=80',
  'groceries':           'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=600&fit=crop&q=80',
  'medicine & health':   'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=600&fit=crop&q=80',
  'electronics':         'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop&q=80',
  'home & kitchen':      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop&q=80',
  'livestock care':      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=600&fit=crop&q=80',
  'clothing':            'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=600&fit=crop&q=80',
  'tools & hardware':    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=600&fit=crop&q=80',
};

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1586864387634-2f33030b3bb1?w=600&h=600&fit=crop&q=80';

@Injectable({
  providedIn: 'root'
})
export class ImageKitService {
  private readonly cdnRoot = 'https://ik.imagekit.io/pswnvzqkb7';

  private readonly transformations: Record<ImageKind, string> = {
    hero:        'tr=w-1920,h-600,f-auto,q-auto',
    category:    'tr=w-400,h-400,f-auto,q-auto',
    product:     'tr=w-600,h-600,f-auto,q-auto',
    cart:        'tr=w-200,h-200,f-auto,q-auto',
    wishlist:    'tr=w-250,h-250,f-auto,q-auto',
    profile:     'tr=w-300,h-300,f-auto,q-auto',
    seller:      'tr=w-300,h-300,f-auto,q-auto',
    logo:        'tr=h-60,f-auto,q-auto',
    placeholder: 'tr=w-400,h-400,f-auto,q-auto',
  };

  /**
   * Resolves an image URL.
   * - If filename is null/empty/placeholder, returns a category-matched Unsplash fallback.
   * - If it's already a full URL (Unsplash, blob, data URI), returns as-is.
   * - If it's a bare filename, builds an ImageKit CDN URL.
   */
  resolve(filename?: string | null, kind: ImageKind = 'product', category?: string): string {
    if (!filename || filename === 'placeholder.webp') {
      return this.fallback(category);
    }

    // Already a full external URL — pass through directly
    if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('data:')) {
      if (filename.startsWith(this.cdnRoot)) {
        const base = filename.split('?')[0];
        return `${base}?${this.transformations[kind] ?? this.transformations.product}`;
      }
      return filename;
    }

    // Bare filename → build ImageKit URL
    const normalized = this.normalizePath(filename);
    const tr = this.transformations[kind] ?? this.transformations.product;
    return `${this.cdnRoot}/${normalized}?${tr}`;
  }

  /** Returns a category-matched Unsplash fallback image URL */
  fallback(category?: string): string {
    if (!category) return DEFAULT_FALLBACK;
    return CATEGORY_FALLBACKS[category.toLowerCase()] ?? DEFAULT_FALLBACK;
  }

  /** @deprecated Use fallback(category) instead for working images */
  placeholder(kind: ImageKind = 'placeholder', category?: string): string {
    return this.fallback(category);
  }

  private normalizePath(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1];
  }
}
