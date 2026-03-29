import { createContext } from 'react';

export type Role = 'ADMIN' | 'COLLABORATOR';

export type AuthState = {
  id: string | null;
  email: string | null;
  name: string | null;
  role: Role | null;
  isSuperAdmin: boolean;
  permissions: string[];
};

export type AuthContextValue = {
  user: AuthState;
  loading: boolean;
  login: (userData: AuthState) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
