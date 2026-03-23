import { createContext } from 'react';

export type Role = 'ADMIN' | 'COLLABORATOR';

export type AuthState = {
  token: string | null;
  role: Role | null;
  isSuperAdmin: boolean;
  permissions: string[];
};

export type AuthContextValue = {
  token: string | null;
  role: Role | null;
  isSuperAdmin: boolean;
  permissions: string[];
  login: (token: string, role: Role, isSuperAdmin: boolean, permissions: string[]) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
