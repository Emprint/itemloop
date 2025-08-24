export interface AuthResponse {
  user: User;
}

export enum UserRole {
  Customer = 'customer',
  Editor = 'editor',
  Admin = 'admin',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole | null;
  created_at: string;
  updated_at: string;
}
