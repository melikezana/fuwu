export type UserRole = "customer" | "provider" | "admin";

export interface Profile {
  id: string; // Matches auth.users.id
  role: UserRole;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface AuthSession {
  user: {
    id: string;
    email?: string;
    phone?: string;
  } | null;
}
