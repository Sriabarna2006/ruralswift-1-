import { Component, OnInit, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

declare const lucide: any;
declare const gsap: any;

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './customer-dashboard.html',
  styleUrls: ['./customer-dashboard.css']
})
export class CustomerDashboardComponent implements OnInit, AfterViewInit {

  customerName = '';
  selectedSection = 'dashboard';

  ngOnInit(): void {
    this.customerName = localStorage.getItem('customerName') || 'Customer';
  }

  ngAfterViewInit(): void {
    // Slight delay ensures Angular renders the DOM first
    setTimeout(() => {
      lucide.createIcons();
      gsap.from('#section-dashboard', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power3.out'
      });
    }, 50);
  }

  setSection(section: string): void {
    this.selectedSection = section;

    // After Angular updates the DOM, animate and re-render icons
    setTimeout(() => {
      lucide.createIcons();

      // Determine which element is now visible
      const sectionId = ['dashboard', 'profile', 'orders'].includes(section)
        ? `section-${section}`
        : 'section-blank';

      const el = document.getElementById(sectionId);
      if (el) {
        gsap.fromTo(el,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
        );
      }
    }, 20);
  }

  onSaveProfile(): void {
    alert('Changes saved successfully!');
  }

}