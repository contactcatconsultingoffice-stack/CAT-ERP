export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type ApiConfig = {
  baseUrl?: string;
};

const defaultConfig: ApiConfig = {
  // In production (Vercel), VITE_API_URL points to the Render backend.
  // In development, Vite's proxy forwards /api → localhost:4000.
  baseUrl: (import.meta.env.VITE_API_URL as string) || '/api'
};

let config: ApiConfig = defaultConfig;

export function logout() {
  // We can't clear HttpOnly cookies from JS, but the backend /logout route does it.
  // This local logout clears local state and redirects.
  window.location.href = '/login';
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  isBlob = false
): Promise<T> {
  const currentConfig = config; 
// Removed verbose logging
  try {
    const res = await fetch(`${currentConfig.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // CRITICAL for HttpOnly cookies
      body: body ? JSON.stringify(body) : undefined
    });

// Removed verbose logging

  if (res.status === 204) {
    return {} as T;
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/2fa/login' && path !== '/auth/2fa/verify') {
      // Don't auto-redirect on /auth/me to avoid infinite loops during checkAuth
      if (path !== '/auth/me') {
        logout();
        throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
      }
      // If it's just /auth/me, just return null or throw silent
      return null as unknown as T;
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || res.statusText);
    } catch {
      throw new Error(text || res.statusText);
    }
  }

    if (isBlob) {
      return (await res.blob()) as unknown as T;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[API] Error on ${path}:`, err);
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  getBlob: (path: string) => request<Blob>('GET', path, undefined, true),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path)
};

