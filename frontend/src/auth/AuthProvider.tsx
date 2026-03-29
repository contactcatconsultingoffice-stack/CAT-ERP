import { useCallback, useEffect, useState } from 'react';
import { AuthContext, type AuthState, type Role } from './AuthContext';
import { api } from '../api/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ 
    id: null,
    email: null,
    name: null,
    role: null, 
    isSuperAdmin: false,
    permissions: [] 
  });
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const user = await api.get<AuthState>('/auth/me');
      if (user) {
        setState(user);
      } else {
        setState({ id: null, email: null, name: null, role: null, isSuperAdmin: false, permissions: [] });
      }
    } catch {
      setState({ id: null, email: null, name: null, role: null, isSuperAdmin: false, permissions: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((userData: AuthState) => {
    setState(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // ignore
    }
    setState({ id: null, email: null, name: null, role: null, isSuperAdmin: false, permissions: [] });
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{ 
        user: state,
        loading,
        login, 
        logout 
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
