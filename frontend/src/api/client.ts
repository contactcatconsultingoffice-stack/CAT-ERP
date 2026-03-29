export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type ApiConfig = {
  baseUrl?: string;
};

const defaultConfig: ApiConfig = {
  baseUrl: '/api'
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
  body?: unknown
): Promise<T> {
  const currentConfig = config; 
  console.log(`[API] Sending ${method} to ${path}`);
  try {
    const res = await fetch(`${currentConfig.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // CRITICAL for HttpOnly cookies
      body: body ? JSON.stringify(body) : undefined
    });

    console.log(`[API] Received status ${res.status} from ${path}`);

  if (res.status === 204) {
    return {} as T;
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      // Don't auto-redirect on /auth/me to avoid infinite loops during checkAuth
      if (path !== '/auth/me') {
        logout();
      }
      throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || res.statusText);
    } catch {
      throw new Error(text || res.statusText);
    }
  }

    return (await res.json()) as T;
  } catch (err) {
    console.error(`[API] Error on ${path}:`, err);
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path)
};

