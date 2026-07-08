// src/app/components/toast/toast.ts
import {
  Component, ChangeDetectionStrategy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  public toastSvc = inject(ToastService);

  trackById(_: number, toast: Toast): number {
    return toast.id;
  }

  dismiss(id: number): void {
    this.toastSvc.dismiss(id);
  }

  icon(type: Toast['type']): string {
    const icons: Record<Toast['type'], string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[type];
  }
}
