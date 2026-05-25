import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LocaleDatePipe } from '../../shared/locale-date.pipe';

interface EmailLog {
  id: number;
  recipient: string;
  template: string;
  subject: string;
  status: 'sent' | 'failed';
  error: string | null;
  created_at: string;
}

@Component({
  selector: 'app-email-logs',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LocaleDatePipe],
  templateUrl: './email-logs.component.html',
  styleUrl: './email-logs.component.scss',
})
export class EmailLogsComponent implements OnInit {
  private http = inject(HttpClient);

  logs = signal<EmailLog[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.http.get<EmailLog[]>(`${environment.apiUrl}admin/email-logs`).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('EMAIL_LOGS.LOAD_ERROR');
        this.loading.set(false);
      },
    });
  }
}
