import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface User {
  id?: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'customer';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUsers() {
    return this.http.get<User[]>(`${environment.apiUrl}users`);
  }

  saveUser(user: Partial<User> & { password?: string }) {
    return this.http.post<User>(`${environment.apiUrl}users/save`, user);
  }

  deleteUser(id: number) {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}users/delete`, { id });
  }
}
