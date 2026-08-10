const ProformaPreview = ({ proforma }) => {
  if (!proforma) return <div>No quotation data</div>;
  return (
    <div className="preview-card">
      <h2>Quotation Preview</h2>
      <p>Quotation #{proforma.quotationNumber}</p>
      <p>Client: {proforma.clientName}</p>
      <p>Project: {proforma.projectName}</p>
      <p>Valid Until: {new Date(proforma.validUntil).toLocaleDateString()}</p>
      <table>
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {proforma.items.map((item, idx) => (
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
        <div>Subtotal: {proforma.subtotal.toFixed(2)}</div>
        <div>Tax: {proforma.tax.toFixed(2)}%</div>
        <div>Total: {proforma.total.toFixed(2)}</div>
      </div>
      <p>{proforma.notes}</p>
    </div>
  );
};

export default ProformaPreview;
