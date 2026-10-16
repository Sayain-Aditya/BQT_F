import { useEffect, useState, useRef } from 'react';
import { getTyres, createTyre, updateTyre, deleteTyre, importTyres } from '../api/tyreApi';

const PAGE_SIZE = 10;
const empty = { name: '', price: '', category: '' };

export default function AdminPage() {
  const [tyres, setTyres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();
  const searchTimer = useRef();

  useEffect(() => { load(''); }, []);

  const load = async (q) => {
    setLoading(true);
    try { setTyres(await getTyres(q)); }
    catch (e) { setMsg(e.message); }
    finally { setLoading(false); }
  };

  const handleSearch = (v) => {
    setSearch(v);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(v), 400);
  };

  const openAdd = () => { setForm(empty); setEditId(null); setFormOpen(true); };
  const openEdit = (t) => { setForm({ name: t.name, price: t.price, category: t.category }); setEditId(t._id); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.price) return setMsg('Name and Price are required.');
    setSaving(true); setMsg('');
    try {
      if (editId) await updateTyre(editId, form);
      else await createTyre(form);
      setFormOpen(false);
      setMsg(editId ? 'Updated.' : 'Added.');
      load(search);
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tyre?')) return;
    try { await deleteTyre(id); load(search); setMsg('Deleted.'); setTimeout(() => setMsg(''), 2000); }
    catch (e) { setMsg(e.message); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setMsg('');
    try {
      const res = await importTyres(file);
      setMsg(res.message);
      load(search);
    } catch (e) { setMsg(e.message); }
    finally { setImporting(false); e.target.value = ''; setTimeout(() => setMsg(''), 4000); }
  };

  const paged = tyres.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(tyres.length / PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tyre Catalogue</h1>
          <p className="text-xs text-gray-500 mt-0.5">{tyres.length} tyres in database</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Excel Import */}
          <label className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${importing ? 'bg-gray-300 text-gray-500' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>
            {importing ? 'Importing…' : '⬆ Import Excel'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          {/* Download template */}
          <a
            href="data:text/csv;charset=utf-8,name,price,category%0ABKT BT673 11.2-24%2C12500%2CAgri"
            download="tyre-template.csv"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            ⬇ Template
          </a>
          <button onClick={openAdd} className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-800 text-white hover:bg-green-700 transition-colors">
            + Add Tyre
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 text-green-800 text-sm font-medium">{msg}</div>}

      {/* Excel format hint */}
          <div className="mb-4 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs">
        Excel columns: <strong>name</strong> (required), <strong>price</strong> (required), category
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, size, pattern, category…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-700"
        />
      </div>

      {/* Add / Edit Form */}
      {formOpen && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{editId ? 'Edit Tyre' : 'Add New Tyre'}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'name', label: 'Name *', placeholder: 'e.g. BKT BT673 11.2-24' },
              { key: 'price', label: 'Price (₹) *', placeholder: 'e.g. 12500', type: 'number' },
              { key: 'category', label: 'Category', placeholder: 'e.g. Agri, OTR' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">{label}</label>
                <input
                  type={type || 'text'}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-[13px] focus:outline-none focus:border-green-700"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {saving ? 'Saving…' : editId ? 'Update' : 'Add'}
            </button>
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
      ) : tyres.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No tyres found. Add one or import from Excel.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Price (₹)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((t, i) => (
                <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {t.category ? <span className="px-2 py-0.5 bg-green-50 text-green-800 rounded-full text-xs font-semibold">{t.category}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{Number(t.price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEdit(t)} className="text-green-700 hover:underline font-medium">Edit</button>
                      <button onClick={() => handleDelete(t._id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <span className="text-xs text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tyres.length)} of {tyres.length}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40">← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${p === page ? 'bg-green-700 text-white border-green-700' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
