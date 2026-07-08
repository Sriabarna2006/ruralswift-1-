// src/app/components/drawer/drawer.ts
import {
  Component, ChangeDetectionStrategy, inject, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { AuthStateService } from '../../services/auth-state.service';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drawer.html',
  styleUrl: './drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerComponent {
  public ui     = inject(UiService);
  private api      = inject(ApiService);
  private router   = inject(Router);
  private toastSvc = inject(ToastService);
  private auth     = inject(AuthStateService);

  public isLoggedIn = computed(() => !!this.auth.token());
  public userInitials = computed(() => {
    const user = this.auth.user();
    if (!user) return '--';
    return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || '--';
  });

  public userName = computed(() => {
    const user = this.auth.user();
    return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Guest User';
  });

  public userEmail = computed(() => this.auth.user()?.email || '');

  close(): void {
    this.ui.closeDrawer();
  }

  navigate(route: string, queryParams?: Record<string, string>): void {
    this.close();
    this.router.navigate([route], queryParams ? { queryParams } : {});
  }

  handleLogout(): void {
    this.close();
    this.api.logout();
    this.router.navigate(['/home']);
    this.toastSvc.success('Signed out successfully');
  }
}
