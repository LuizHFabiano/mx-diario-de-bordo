const API_BASE = import.meta.env?.VITE_API_URL || 'https://backend-theta-eight-68.vercel.app';

export async function apiClient(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  
  // Se estiver chamando um domínio externo diferente, evita conflito com Access-Control-Allow-Origin: *
  const isExternal = url.startsWith('http') && !url.includes(window.location.host);

  const response = await fetch(url, {
    credentials: isExternal ? 'omit' : 'include',
    headers: {
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Não foi possível concluir a operação.');
  }
  return payload;
}
