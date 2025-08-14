import { Injectable } from '@angular/core';
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
  constructor(private http: HttpClient) {}

  getUsers() {
  return this.http.get<User[]>(`${environment.backendUrl}api/users`);
  }

  saveUser(user: Partial<User> & { password?: string }) {
  return this.http.post<User>(`${environment.backendUrl}api/users/save`, user);
  }

  deleteUser(id: number) {
  return this.http.post<{ success: boolean }>(`${environment.backendUrl}api/users/delete`, { id });
  }
}
