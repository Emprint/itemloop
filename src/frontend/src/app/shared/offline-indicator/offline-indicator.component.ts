import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OfflineStorageService } from '../offline-storage.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.scss'],
})
export class OfflineIndicatorComponent {
  private offlineStorage = inject(OfflineStorageService);
  private translate = inject(TranslateService);

  isOnline = this.offlineStorage.isOnline;
  hasPendingSync = this.offlineStorage.hasPendingSync;
}
