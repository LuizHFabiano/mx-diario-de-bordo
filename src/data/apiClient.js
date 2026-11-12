// Cliente de API centralizado
export const API_BASE = 'https://backend-theta-eight-68.vercel.app';

export async function apiClient(path, options = {}) {
  const url = path.startsWith('http') 
    ? path 
    : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;

  const headers = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Não foi possível concluir a operação.');
  }

  return payload;
}

export default apiClient;
