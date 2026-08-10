export const calculateTotals = (invoice) => {
  const items = invoice.items.map((item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    return { ...item, amount };
  });
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = Number(invoice.tax) || 0;
  const total = subtotal + (subtotal * taxRate) / 100;
  return { ...invoice, items, subtotal, total };
};
