import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../auth/auth-response';

@Component({
  selector: 'app-settings-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './settings-dashboard.component.html',
  styleUrl: './settings-dashboard.component.scss',
})
export class SettingsDashboardComponent {
  private auth = inject(AuthService);
  isAdmin = () => this.auth.user()?.role === UserRole.Admin;
}
