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

export const getInvoices = () => request('/api/invoices');
export const getInvoice = (id) => request(`/api/invoices/${id}`);
export const saveInvoice = (invoice) => request('/api/invoices', { method: 'POST', body: JSON.stringify(invoice) });
export const updateInvoice = (id, invoice) => request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(invoice) });
export const deleteInvoice = (id) => request(`/api/invoices/${id}`, { method: 'DELETE' });
export const getNextInvoiceNumber = () => request('/api/invoices/next');
