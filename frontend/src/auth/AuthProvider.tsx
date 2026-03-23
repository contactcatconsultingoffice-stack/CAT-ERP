import { useCallback, useEffect, useState } from 'react';
import { AuthContext, type AuthState, type Role } from './AuthContext';

const STORAGE_KEY = 'cat-erp-auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ 
    token: null, 
    role: null, 
    isSuperAdmin: false,
    permissions: [] 
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthState;
        setState(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  const login = useCallback((token: string, role: Role, isSuperAdmin: boolean, permissions: string[]) => {
    const next = { token, role, isSuperAdmin, permissions };
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    setState({ token: null, role: null, isSuperAdmin: false, permissions: [] });
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ 
        token: state.token, 
        role: state.role, 
        isSuperAdmin: state.isSuperAdmin, 
        permissions: state.permissions,
        login, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
