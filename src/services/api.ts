// Typed HTTP API Client for EVENTHUB with Automatic 401 Refresh Token Retry

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(newToken: string | null) => void> = [];

function subscribeTokenRefresh(cb: (newToken: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken: string | null) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('eventhub_refresh');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.success && data.tokens?.accessToken) {
      localStorage.setItem('eventhub_token', data.tokens.accessToken);
      if (data.tokens?.refreshToken) {
        localStorage.setItem('eventhub_refresh', data.tokens.refreshToken);
      }
      return data.tokens.accessToken;
    }
  } catch (err) {
    console.warn('Network error while refreshing token:', err);
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  let token = localStorage.getItem('eventhub_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const activeCollege = localStorage.getItem('eventhub_active_college');
  if (activeCollege && !headers['x-college-id']) {
    headers['x-college-id'] = activeCollege;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 with Token Refresh (Requirement: Global 401 handling)
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh-token') &&
    !endpoint.includes('/auth/register')
  ) {
    const refreshToken = localStorage.getItem('eventhub_refresh');
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await tryRefreshToken();
        isRefreshing = false;
        onRefreshed(newToken);

        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          return request<T>(endpoint, { ...options, headers }, true);
        } else {
          // Token refresh truly failed - clear tokens and dispatch event
          localStorage.removeItem('eventhub_token');
          localStorage.removeItem('eventhub_refresh');
          window.dispatchEvent(new CustomEvent('eventhub:session_expired'));
        }
      } else {
        // Wait for ongoing refresh
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (newToken) {
              headers['Authorization'] = `Bearer ${newToken}`;
              request<T>(endpoint, { ...options, headers }, true).then(resolve).catch(reject);
            } else {
              reject(new ApiError('Session expired. Please log in again.', 401));
            }
          });
        });
      }
    }
  }

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { message: text };
  }

  if (!response.ok) {
    let msg = data.message;
    if (typeof msg === 'string' && (msg.includes('<html') || msg.includes('<!DOCTYPE') || msg.includes('<body'))) {
      if (response.status === 403) {
        msg = 'Access forbidden (403)';
      } else if (response.status === 404) {
        msg = 'Resource not found (404)';
      } else if (response.status >= 500) {
        msg = 'Server error occurred. Please try again.';
      } else {
        msg = `Request failed with status ${response.status}`;
      }
    }
    throw new ApiError(msg || `Request failed with status ${response.status}`, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string, params?: Record<string, any>) => {
    let endpoint = url;
    if (params) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          q.append(k, String(v));
        }
      }
      const qs = q.toString();
      if (qs) endpoint += `?${qs}`;
    }
    return request<T>(endpoint, { method: 'GET' });
  },

  post: <T>(url: string, body?: any, options?: RequestInit) => {
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },

  put: <T>(url: string, body?: any, options?: RequestInit) => {
    return request<T>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },

  patch: <T>(url: string, body?: any, options?: RequestInit) => {
    return request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },

  delete: <T>(url: string, options?: RequestInit) => {
    return request<T>(url, { ...options, method: 'DELETE' });
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ success: boolean; fileUrl: string; fileName: string; originalName: string }>('/upload', {
      method: 'POST',
      body: formData,
    });
  },
};
