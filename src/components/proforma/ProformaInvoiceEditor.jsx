import { useEffect, useState } from 'react';
import FormField from '../shared/FormField';
import Toolbar from '../shared/Toolbar';
import { getNextQuotationNumber, saveProforma, updateProforma, getProforma } from '../../api/proformaInvoiceApi';
import { calculateTotals } from '../../utils/calculations';

const defaultProforma = {
  quotationNumber: '',
  clientName: '',
  projectName: '',
  date: new Date().toISOString().slice(0, 10),
  validUntil: new Date().toISOString().slice(0, 10),
  items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
  subtotal: 0,
  tax: 0,
  total: 0,
  notes: '',
  status: 'draft',
};

const ProformaInvoiceEditor = ({ proformaId }) => {
  const [proforma, setProforma] = useState(defaultProforma);

  useEffect(() => {
    if (!proformaId) {
      getNextQuotationNumber().then((data) => setProforma((prev) => ({ ...prev, quotationNumber: data.nextQuotationNumber }))).catch(console.error);
      return;
    }
    getProforma(proformaId).then(setProforma).catch(console.error);
  }, [proformaId]);

  const updateField = (field, value) => setProforma((prev) => ({ ...prev, [field]: value }));
  const updateItem = (index, field, value) => {
    const updatedItems = [...proforma.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'description' ? value : Number(value),
      amount:
        field === 'description'
          ? updatedItems[index].amount
          : (field === 'quantity' ? Number(value) : updatedItems[index].quantity) * (field === 'rate' ? Number(value) : updatedItems[index].rate),
    };
    setProforma((prev) => calculateTotals({ ...prev, items: updatedItems }));
  };

  const addItem = () => setProforma((prev) => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, rate: 0, amount: 0 }] }));
  const removeItem = (index) => setProforma((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));

  const handleSave = async () => {
    const payload = calculateTotals(proforma);
    try {
      if (proformaId) await updateProforma(proformaId, payload);
      else await saveProforma(payload);
      alert('Proforma saved');
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="editor-page">
      <Toolbar onSave={handleSave} onPrint={() => window.print()} />
      <div className="editor-grid">
        <div className="editor-form">
          <FormField label="Quotation Number">
            <input value={proforma.quotationNumber} onChange={(e) => updateField('quotationNumber', e.target.value)} />
          </FormField>
          <FormField label="Client Name">
            <input value={proforma.clientName} onChange={(e) => updateField('clientName', e.target.value)} />
          </FormField>
          <FormField label="Project Name">
            <input value={proforma.projectName} onChange={(e) => updateField('projectName', e.target.value)} />
          </FormField>
          <FormField label="Valid Until">
            <input type="date" value={proforma.validUntil.slice(0, 10)} onChange={(e) => updateField('validUntil', e.target.value)} />
          </FormField>
          <section className="item-table">
            <h2>Line Items</h2>
            {proforma.items.map((item, idx) => (
              <div className="item-row" key={idx}>
                <input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                <input type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                <input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)} />
                <input value={item.amount.toFixed(2)} readOnly />
                <button type="button" onClick={() => removeItem(idx)}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={addItem}>Add item</button>
          </section>
          <FormField label="Tax %">
            <input type="number" min="0" step="0.1" value={proforma.tax} onChange={(e) => updateField('tax', Number(e.target.value))} />
          </FormField>
          <FormField label="Notes">
            <textarea value={proforma.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </FormField>
        </div>
        <div className="editor-preview">
          <h2>Quotation Preview</h2>
          <div className="preview-card">
            <p><strong>Quotation #{proforma.quotationNumber}</strong></p>
            <p>Client: {proforma.clientName}</p>
            <p>Project: {proforma.projectName}</p>
            <p>Valid Until: {proforma.validUntil.slice(0, 10)}</p>
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
        </div>
      </div>
    </div>
  );
};

export default ProformaInvoiceEditor;
