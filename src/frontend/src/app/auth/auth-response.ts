export interface AuthResponse {
  user: User;
}

export type UserRole = 'customer' | 'editor' | 'admin' | null;

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
