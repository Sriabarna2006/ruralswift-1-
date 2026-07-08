// src/app/components/loading-overlay/loading-overlay.ts
import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { ImageKitService } from '../../services/imagekit.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent implements OnInit {
  private ui = inject(UiService);
  private imageKit = inject(ImageKitService);

  percent = signal(0);
  statusText = signal('Initializing system');
  isHidden = signal(false);
  public brandLogo = this.imageKit.resolve('logo.png', 'logo');
  public brandLogoFallback = this.imageKit.placeholder('logo');

  private stages = [
    { pct: 10, text: 'Connecting to network' },
    { pct: 30, text: 'Loading resources' },
    { pct: 55, text: 'Fetching data' },
    { pct: 75, text: 'Preparing your experience' },
    { pct: 90, text: 'Almost ready' },
    { pct: 100, text: 'Welcome to RuralSwift' },
  ];

  ngOnInit(): void {
    this.runAnimation();
  }

  handleImageError(event: Event, fallback: string): void {
    (event.target as HTMLImageElement).src = fallback;
  }

  private runAnimation(): void {
    let index = 0;
    const interval = setInterval(() => {
      if (index < this.stages.length) {
        const stage = this.stages[index];
        this.percent.set(stage.pct);
        this.statusText.set(stage.text);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.isHidden.set(true);
          this.ui.hideLoading();
        }, 400);
      }
    }, 320);
  }
}
