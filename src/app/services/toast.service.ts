// src/app/services/toast.service.ts
import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();
  private nextId = 1;

  show(message: string, type: ToastType = 'info', duration = 3500): void {
    const id = this.nextId++;
    const toast: Toast = { id, message, type, duration };
    this._toasts.update(t => [...t, toast]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void   { this.show(message, 'error'); }
  warning(message: string): void { this.show(message, 'warning'); }
  info(message: string): void    { this.show(message, 'info'); }

  dismiss(id: number): void {
    this._toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
