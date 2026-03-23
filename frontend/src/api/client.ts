export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type ApiConfig = {
  baseUrl?: string;
  getToken?: () => string | null;
};

const defaultConfig: ApiConfig = {
  baseUrl: '/api',
  getToken: () => {
    // Always check localStorage as the primary source to avoid race conditions
    const raw = localStorage.getItem('cat-erp-auth');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.token || null;
    } catch {
      return null;
    }
  }
};

let config: ApiConfig = defaultConfig;

export function logout() {
  localStorage.removeItem('cat-erp-auth'); // New key
  window.location.href = '/login';
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown
): Promise<T> {
  const currentConfig = config; // Use captured config
  const token = currentConfig.getToken?.() ?? null;
  const res = await fetch(`${currentConfig.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 204) {
    return {} as T;
  }

  if (!res.ok) {
    if (res.status === 401) {
      logout();
      throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
    }
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path)
};

