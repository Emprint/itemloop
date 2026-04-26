import { Component, OnInit, inject, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HomeService, DashboardStats } from './home.service';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  readonly donutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('donutCanvas');

  private homeService = inject(HomeService);
  private authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly stats = signal<DashboardStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly isEditorOrAdmin = computed(() => {
    const role = this.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  });

  readonly isAdmin = computed(() => this.user()?.role === UserRole.Admin);

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const s = this.stats();
      const canvas = this.donutCanvas();
      if (s?.products_by_category?.length && canvas) {
        this.drawDonut(s.products_by_category, canvas.nativeElement);
      }
    });
  }

  ngOnInit() {
    this.homeService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private drawDonut(categories: { name: string; count: number }[], canvas: HTMLCanvasElement) {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    const palette = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: categories.map(c => c.name ? c.name.charAt(0).toUpperCase() + c.name.slice(1) : ''),
        datasets: [{
          data: categories.map(c => c.count),
          backgroundColor: categories.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
        }],
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` } },
        },
      },
    });
  }
}
