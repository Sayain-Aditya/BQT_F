import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import FormField from '../shared/FormField';
import Toolbar from '../shared/Toolbar';
import { getNextInvoiceNumber, saveInvoice, updateInvoice, getInvoice } from '../../api/invoiceApi';
import { calculateTotals } from '../../utils/calculations';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900';

const defaultInvoice = {
  invoiceNumber: '',
  customerName: '',
  companyName: 'MKS Alliance',
  date: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
  subtotal: 0,
  tax: 0,
  total: 0,
  notes: '',
  status: 'draft',
};

const InvoiceEditor = ({ invoiceId }) => {
  const [invoice, setInvoice] = useState(defaultInvoice);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const printAreaRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!invoiceId) {
      getNextInvoiceNumber().then((d) => setInvoice((p) => ({ ...p, invoiceNumber: d.nextInvoiceNumber }))).catch(console.error);
      return;
    }
    getInvoice(invoiceId).then(setInvoice).catch(console.error);
  }, [invoiceId]);

  useEffect(() => {
    setInvoice((c) => calculateTotals(c));
  }, [invoice.items, invoice.tax]);

  const updateField = (field, value) => setInvoice((p) => ({ ...p, [field]: value }));

  const updateItem = (index, field, value) => {
    const items = [...invoice.items];
    items[index] = {
      ...items[index],
      [field]: field === 'description' ? value : Number(value),
      amount: field === 'description'
        ? items[index].amount
        : (field === 'quantity' ? Number(value) : items[index].quantity) * (field === 'rate' ? Number(value) : items[index].rate),
    };
    setInvoice((p) => calculateTotals({ ...p, items }));
  };

  const addItem = () => setInvoice((p) => ({ ...p, items: [...p.items, { description: '', quantity: 1, rate: 0, amount: 0 }] }));
  const removeItem = (i) => setInvoice((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = calculateTotals(invoice);
      const saved = invoiceId ? await updateInvoice(invoiceId, payload) : await saveInvoice(payload);
      if (!invoiceId && saved?.invoiceNumber) {
        setInvoice((p) => ({ ...p, invoiceNumber: saved.invoiceNumber }));
      }
      navigate('/');
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const getPdfFileName = () => {
    const label = invoice.invoiceNumber || invoice.customerName || 'invoice';
    return `${label}`.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') + '.pdf';
  };

  const createPdfBlob = async () => {
    if (!printAreaRef.current) throw new Error('Invoice preview is not ready');
    const canvas = await html2canvas(printAreaRef.current, {
      backgroundColor: '#ffffff',
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
    });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let pageIndex = 0;
    let remainingHeight = imgHeight;
    while (remainingHeight > 0) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin - pageIndex * usableHeight, imgWidth, imgHeight);
      remainingHeight -= usableHeight;
      pageIndex += 1;
    }

    return pdf.output('blob');
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSharePdf = async () => {
    setSharing(true);
    try {
      const blob = await createPdfBlob();
      const fileName = getPdfFileName();
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const message = `Sharing ${invoice.invoiceNumber || 'invoice'} from ${invoice.companyName}.`;

      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title: fileName, text: message, files: [file] });
      } else {
        downloadBlob(blob, fileName);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${message} PDF downloaded. Please attach ${fileName} in WhatsApp.`)}`,
          '_blank',
          'noopener,noreferrer'
        );
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div>
      <Toolbar onSave={handleSave} onPrint={() => window.print()} onSharePdf={handleSharePdf} saving={saving} sharing={sharing} />
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">

        {/* FORM */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-x-4">
            <FormField label="Invoice Number">
              <input className={inputCls} value={invoice.invoiceNumber} onChange={(e) => updateField('invoiceNumber', e.target.value)} />
            </FormField>
            <FormField label="Status">
              <select className={inputCls} value={invoice.status} onChange={(e) => updateField('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </FormField>
          </div>
          <FormField label="Customer Name">
            <input className={inputCls} value={invoice.customerName} onChange={(e) => updateField('customerName', e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-x-4">
            <FormField label="Invoice Date">
              <input type="date" className={inputCls} value={invoice.date.slice(0, 10)} onChange={(e) => updateField('date', e.target.value)} />
            </FormField>
            <FormField label="Due Date">
              <input type="date" className={inputCls} value={invoice.dueDate.slice(0, 10)} onChange={(e) => updateField('dueDate', e.target.value)} />
            </FormField>
          </div>

          <h3 className="text-sm font-bold text-gray-700 mt-2 mb-3 pb-2 border-b border-gray-100">Line Items</h3>
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-[2fr_0.6fr_0.8fr_0.8fr_auto] gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
              <span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span><span></span>
            </div>
            {invoice.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_0.6fr_0.8fr_0.8fr_auto] gap-2 items-center">
                <input className={inputCls} placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                <input className={inputCls} type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                <input className={inputCls} type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)} />
                <input className={`${inputCls} bg-gray-50`} value={item.amount.toFixed(2)} readOnly />
                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="text-sm text-blue-700 hover:text-blue-900 font-medium border border-dashed border-blue-300 rounded-lg px-4 py-1.5 w-full hover:bg-blue-50 transition-colors">
            + Add Item
          </button>

          <div className="grid grid-cols-2 gap-x-4 mt-4">
            <FormField label="Tax %">
              <input type="number" min="0" step="0.1" className={inputCls} value={invoice.tax} onChange={(e) => updateField('tax', Number(e.target.value))} />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea className={`${inputCls} min-h-[80px] resize-y`} value={invoice.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </FormField>
        </div>

        {/* PREVIEW */}
        <div ref={printAreaRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 print-area print:shadow-none print:border-none">
          <h2 className="text-base font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100 print:hidden">Preview</h2>
          <div className="text-sm text-gray-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xl font-extrabold text-blue-900">{invoice.companyName}</p>
                <p className="text-gray-500 text-xs mt-1">Invoice #{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Date: {invoice.date.slice(0, 10)}</p>
                <p>Due: {invoice.dueDate.slice(0, 10)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">Bill To</p>
            <p className="font-semibold text-gray-800 mb-5">{invoice.customerName || '—'}</p>

            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-600">Description</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-600">Qty</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600">Rate</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2 text-gray-700">{item.description || '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{item.rate.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-medium">{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-gray-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{invoice.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax ({invoice.tax}%)</span><span>{((invoice.subtotal * invoice.tax) / 100).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span><span>₹{invoice.total.toFixed(2)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-xs text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditor;
