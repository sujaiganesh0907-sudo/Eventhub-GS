// Typed HTTP API Client for EVENTHUB

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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('eventhub_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { message: text };
  }

  if (!response.ok) {
    throw new ApiError(data.message || `Request failed with status ${response.status}`, response.status, data);
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

  post: <T>(url: string, body?: any) => {
    return request<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },

  put: <T>(url: string, body?: any) => {
    return request<T>(url, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },

  patch: <T>(url: string, body?: any) => {
    return request<T>(url, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },

  delete: <T>(url: string) => {
    return request<T>(url, { method: 'DELETE' });
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
