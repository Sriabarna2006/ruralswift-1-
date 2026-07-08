// src/app/components/bottom-nav/bottom-nav.ts
import {
  Component, ChangeDetectionStrategy, inject
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  public cart = inject(CartService);
}
