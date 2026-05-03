import { Component, OnInit, signal, inject } from '@angular/core';
import { DropdownService } from '../../shared/dropdown.service';
import { UserService, User } from '../user.service';
import { UserRole } from '../../auth/auth-response';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { emailTldValidator } from '../../shared/email-tld.validator';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { ListShellComponent } from '../../shared/list-shell/list-shell.component';
import { LocaleDatePipe } from '../../shared/locale-date.pipe';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModal, TranslateModule, ListShellComponent, LocaleDatePipe],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersList implements OnInit {
  private translate = inject(TranslateService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private dropdown = inject(DropdownService);

showReLoginNotice = false;
  allUsers = signal<User[]>([]);
  showForm = false;
  form: FormGroup;
  showPassword = false;
  showDeleteModal = false;
  userToDelete: User | null = null;
  errorMessage = signal<string | null>(null);
  serverErrors = signal<Record<string, string[]>>({});
  selectedUser: User | null = null;

  searchQuery = signal('');
  selectedRole = signal('');
  selectedStatus = signal('');

  filteredUsers = signal<User[]>([]);

  readonly roleOptions = ['', 'admin', 'editor', 'member', 'customer'];
  readonly statusOptions = ['', 'active', 'pending'];

  userSearchFn = (user: User, q: string) =>
    user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);

  constructor() {
    this.form = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, emailTldValidator, Validators.maxLength(255)]],
      role: [UserRole.Customer, [Validators.required]],
      password: [''],
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.applyFilter();
        this.errorMessage.set(null);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('ERRORS.FAILED_LOAD_USERS'));
      },
    });
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.applyFilter();
  }

  onRoleChange(role: string) {
    this.selectedRole.set(role);
    this.applyFilter();
  }

  onStatusChange(status: string) {
    this.selectedStatus.set(status);
    this.applyFilter();
  }

  applyFilter() {
    let result = this.allUsers();

    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    const role = this.selectedRole();
    if (role) {
      result = result.filter(u => u.role === role);
    }

    const status = this.selectedStatus();
    if (status) {
      result = result.filter(u => (u.status ?? 'active') === status);
    }

    this.filteredUsers.set(result);
  }

  pendingCount() {
    return this.allUsers().filter(u => (u.status ?? 'active') === 'pending').length;
  }

  selectUser(user: User) {
    this.selectedUser = { ...user };
    this.showForm = true;
    this.form.patchValue({ ...user, password: '' });
  }

  validateUser(user: User) {
    if (!user.id) return;
    this.userService.validateUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        const code = err?.error?.error;
        if (code) {
          this.errorMessage.set(this.translate.instant('ERRORS.' + code));
        } else {
          this.errorMessage.set(this.translate.instant('ERRORS.FAILED_VALIDATE_USER'));
        }
      },
    });
  }

  deactivateUser(user: User) {
    if (!user.id) return;
    this.userService.deactivateUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        const code = err?.error?.error;
        if (code) {
          this.errorMessage.set(this.translate.instant('ERRORS.' + code));
        } else {
          this.errorMessage.set(this.translate.instant('ERRORS.FAILED_DEACTIVATE_USER'));
        }
      },
    });
  }

  saveUser() {
    if (!this.form.valid) {
      const emailControl = this.form.get('email');
      if (emailControl?.errors?.['email']) {
        this.errorMessage.set(this.translate.instant('ERRORS.EMAIL_INVALID'));
      } else {
        this.errorMessage.set(this.translate.instant('ERRORS.REQUIRED_FIELDS'));
      }
      return;
    }
    this.serverErrors.set({});
    this.userService.saveUser(this.form.value).subscribe({
      next: (user) => {
        if (user.id === this.authService.user()?.id && this.form.get('password')?.value) {
          this.showReLoginNotice = true;
          this.authService.softLogout();
        } else {
          this.loadUsers();
        }
        this.selectedUser = null;
        this.showForm = false;
        this.resetForm();
        this.errorMessage.set(null);
      },
      error: (err) => {
        const code = err?.error?.error;
        if (code === 'ERROR_VALIDATION' && err?.error?.errors) {
          this.serverErrors.set(err.error.errors);
          this.errorMessage.set(null);
        } else if (code) {
          this.errorMessage.set(this.translate.instant('ERRORS.' + code));
        } else {
          this.errorMessage.set(this.translate.instant('ERRORS.FAILED_SAVE_USER'));
        }
      },
    });
  }

  confirmDeleteUser(user: User) {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  deleteUserConfirmed() {
    if (this.userToDelete && this.userToDelete.id) {
      this.userService.deleteUser(this.userToDelete.id).subscribe({
        next: () => {
          this.loadUsers();
          this.selectedUser = null;
          this.userToDelete = null;
          this.showDeleteModal = false;
          this.errorMessage.set(null);
        },
        error: (err) => {
          this.showDeleteModal = false;
          const code = err?.error?.error;
          if (code) {
            this.errorMessage.set(this.translate.instant('ERRORS.' + code));
          } else if (err.status === 403) {
            this.errorMessage.set(this.translate.instant('ERRORS.CANNOT_DELETE_USER'));
          } else {
            this.errorMessage.set(this.translate.instant('ERRORS.FAILED_DELETE_USER'));
          }
        },
      });
    }
  }

  cancelDeleteUser() {
    this.userToDelete = null;
    this.showDeleteModal = false;
  }

  newUserForm() {
    this.selectedUser = null;
    this.showForm = true;
    this.resetForm();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  cancel() {
    this.selectedUser = null;
    this.showForm = false;
    this.serverErrors.set({});
    this.resetForm();
  }

  openDropdown(user: User, e: MouseEvent) {
    const items = [];
    if (user.status === 'pending') {
      items.push({ label: this.translate.instant('ACTIVATE'), action: () => this.validateUser(user) });
    } else if (user.status === 'active' && user.role !== UserRole.Admin) {
      items.push({ label: this.translate.instant('DEACTIVATE'), danger: true, action: () => this.deactivateUser(user) });
    }
    items.push({ label: this.translate.instant('EDIT'), action: () => this.selectUser(user) });
    if (!this.isLastAdmin(user)) {
      items.push({ label: this.translate.instant('DELETE'), danger: true, action: () => this.confirmDeleteUser(user) });
    }
    this.dropdown.open(items, e);
  }

  isLastAdmin(user: User): boolean {
    if (user.role !== UserRole.Admin) return false;
    const admins = this.allUsers().filter((u: User) => u.role === UserRole.Admin);
    return admins.length === 1 && admins[0].id === user.id;
  }

  private resetForm() {
    this.form.reset({ name: '', email: '', role: UserRole.Customer, password: '' });
  }
}