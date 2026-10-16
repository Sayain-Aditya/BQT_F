import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice, saveInvoice } from '../api/invoiceApi';
import { getProformas, deleteProforma } from '../api/proformaInvoiceApi';

const PAGE_SIZE = 10;

const statusColor = (s) => ({
  draft: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
}[s] ?? 'bg-gray-100 text-gray-700');

function Pagination({ page, total, onChange }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
      <span className="text-xs text-gray-500">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              p === page
                ? 'bg-green-700 text-white border-green-700'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const [tab, setTab] = useState('proforma');
  const [invoices, setInvoices] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [proformaPage, setProformaPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);

  useEffect(() => { refresh(); }, []);

  // Reset to page 1 when search changes
  useEffect(() => { setProformaPage(1); setInvoicePage(1); }, [search]);
  useEffect(() => { setProformaPage(1); setInvoicePage(1); }, [tab]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [inv, pro] = await Promise.all([getInvoices(), getProformas()]);
      setInvoices(inv);
      setProformas(pro);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    await deleteInvoice(id);
    refresh();
  };

  const handleDeleteProforma = async (id) => {
    if (!window.confirm('Delete this proforma?')) return;
    await deleteProforma(id);
    refresh();
  };

  const handleDuplicate = async (invoice) => {
    const dup = { ...invoice, invoiceNumber: `${invoice.invoiceNumber}-COPY`, status: 'draft' };
    delete dup._id; delete dup.createdAt; delete dup.updatedAt;
    await saveInvoice(dup);
    refresh();
  };

  const q = search.toLowerCase().trim();

  const filteredProformas = proformas.filter((p) =>
    !q || (p.refNo || '').toLowerCase().includes(q) || (p.to?.name || '').toLowerCase().includes(q)
  );
  const filteredInvoices = invoices.filter((inv) =>
    !q || (inv.invoiceNumber || '').toLowerCase().includes(q) || (inv.customerName || '').toLowerCase().includes(q)
  );

  const pagedProformas = filteredProformas.slice((proformaPage - 1) * PAGE_SIZE, proformaPage * PAGE_SIZE);
  const pagedInvoices = filteredInvoices.slice((invoicePage - 1) * PAGE_SIZE, invoicePage * PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/new" className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors">
            + New Invoice
          </Link>
          <Link to="/proforma" className="bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
            + New Quotation
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['proforma', 'invoice'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize rounded-t-lg transition-colors ${
              tab === t ? 'bg-white border border-b-white border-gray-200 text-green-900 -mb-px' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'proforma' ? `Quotations (${proformas.length})` : `Invoices (${invoices.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={tab === 'proforma' ? 'Search by ref no or client name…' : 'Search by invoice # or customer…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-700"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
      ) : tab === 'proforma' ? (
        filteredProformas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-4">{q ? 'No results found.' : 'No quotations yet.'}</p>
            {!q && <Link to="/proforma" className="bg-green-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700">Create your first quotation</Link>}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ref No</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedProformas.map((p, i) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{(proformaPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.refNo || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.to?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.date || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {p.totals?.rounded != null ? `₹${Number(p.totals.rounded).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <Link to={`/proforma/${p._id}`} className="text-green-700 hover:underline font-medium">Edit</Link>
                        <button onClick={() => handleDeleteProforma(p._id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={proformaPage} total={filteredProformas.length} onChange={setProformaPage} />
          </div>
        )
      ) : (
        filteredInvoices.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-4">{q ? 'No results found.' : 'No invoices yet.'}</p>
            {!q && <Link to="/new" className="bg-green-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700">Create your first invoice</Link>}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Invoice #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedInvoices.map((inv, i) => (
                  <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{(invoicePage - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">#{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <Link to={`/edit/${inv._id}`} className="text-green-700 hover:underline font-medium">Edit</Link>
                        <button onClick={() => handleDuplicate(inv)} className="text-gray-500 hover:text-gray-800 font-medium hidden sm:inline">Duplicate</button>
                        <button onClick={() => handleDelete(inv._id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={invoicePage} total={filteredInvoices.length} onChange={setInvoicePage} />
          </div>
        )
      )}
    </div>
  );
};

export default Dashboard;
