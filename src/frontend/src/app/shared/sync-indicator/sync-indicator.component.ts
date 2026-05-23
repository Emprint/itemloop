import { Component, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SyncService, SyncState } from './sync.service';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';

@Component({
  selector: 'app-sync-indicator',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './sync-indicator.component.html',
  styleUrl: './sync-indicator.component.scss',
})
export class SyncIndicatorComponent {
  readonly syncService = inject(SyncService);
  private readonly authService = inject(AuthService);
  private readonly elementRef = inject(ElementRef);

  readonly syncState = this.syncService.syncState;
  readonly label = this.syncService.label;
  readonly pendingChanges = this.syncService.pendingChanges;
  readonly lastSync = this.syncService.lastSync;
  readonly syncDetails = this.syncService.syncDetails;

  readonly showPanel = signal(false);
  readonly panelPosition = signal<{ bottom: number; left: number; width: number } | null>(null);

  readonly isEditorOrAdmin = computed(() => {
    const role = this.authService.user()?.role;
    return role === UserRole.Editor || role === UserRole.Admin;
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('app-sync-indicator') && !target.closest('.sync-panel-popup')) {
      this.showPanel.set(false);
    }
  }

  isState(state: SyncState): boolean {
    return this.syncState() === state;
  }

  togglePanel(event?: Event) {
    if (event) event.stopPropagation();
    if (!this.showPanel()) {
      const el: HTMLElement = this.elementRef.nativeElement.querySelector('.sync-indicator');
      if (el) {
        const rect = el.getBoundingClientRect();
        this.panelPosition.set({
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          width: Math.max(rect.width, 240),
        });
      }
    }
    this.showPanel.update((v) => !v);
  }

  getLastSyncText(): string {
    const last = this.lastSync();
    if (!last) return '';
    const now = new Date();
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      return last.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return last.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  async manualSync() {
    await this.syncService.syncAll();
  }

  isSyncing(): boolean {
    return this.syncState() === 'syncing';
  }
}
