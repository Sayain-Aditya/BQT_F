const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || 'Request failed');
  }
  return res.json();
};

export const getTyres = (q = '') => request(`/api/tyres${q ? `?q=${encodeURIComponent(q)}` : ''}`);
export const createTyre = (data) => request('/api/tyres', { method: 'POST', body: JSON.stringify(data) });
export const updateTyre = (id, data) => request(`/api/tyres/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTyre = (id) => request(`/api/tyres/${id}`, { method: 'DELETE' });

export const importTyres = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${baseUrl}/api/tyres/import`, { method: 'POST', body: formData });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || 'Import failed');
  }
  return res.json();
};
