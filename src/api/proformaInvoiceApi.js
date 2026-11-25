const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Request failed');
  }
  return response.json();
};

export const getProformas = ({ page = 1, limit = 10, search = '' } = {}) =>
  request(`/api/proforma-invoices?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
export const restoreProforma = (id) => request(`/api/proforma-invoices/${id}/restore`, { method: 'PATCH' });
export const getProforma = (id) => request(`/api/proforma-invoices/${id}`);
export const saveProforma = (proforma) => request('/api/proforma-invoices', { method: 'POST', body: JSON.stringify(proforma) });
export const updateProforma = (id, proforma) => request(`/api/proforma-invoices/${id}`, { method: 'PUT', body: JSON.stringify(proforma) });
export const deleteProforma = (id) => request(`/api/proforma-invoices/${id}`, { method: 'DELETE' });
export const getNextQuotationNumber = () => request('/api/proforma-invoices/next');
