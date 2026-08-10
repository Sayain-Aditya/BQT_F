const InvoicePreview = ({ invoice }) => {
  if (!invoice) return <div>No invoice data</div>;

  return (
    <div className="preview-card">
      <h2>Invoice Preview</h2>
      <p><strong>{invoice.companyName}</strong></p>
      <p>Invoice #{invoice.invoiceNumber}</p>
      <p>Customer: {invoice.customerName}</p>
      <p>Date: {new Date(invoice.date).toLocaleDateString()}</p>
      <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
      <table>
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={idx}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{item.rate.toFixed(2)}</td>
              <td>{item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals">
        <div>Subtotal: {invoice.subtotal.toFixed(2)}</div>
        <div>Tax: {invoice.tax.toFixed(2)}%</div>
        <div>Total: {invoice.total.toFixed(2)}</div>
      </div>
      <p>{invoice.notes}</p>
    </div>
  );
};

export default InvoicePreview;
