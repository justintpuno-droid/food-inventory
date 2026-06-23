import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, Download, X, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

const API = '/api';
const CATEGORIES = ['Dry Goods', 'Frozen', 'Mixed'];

// ── shared input class ──────────────────────────────────────────────────────
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const label = 'block text-xs font-medium text-gray-600 mb-1';

// ── Product add/edit modal ──────────────────────────────────────────────────
function ProductModal({ product, onSave, onClose }) {
  const blank = {
    name: '', sku: '', category: 'Dry Goods', unit_of_measure: '',
    reorder_threshold: 0, expiration_date: '', current_stock: 0,
  };
  const [form, setForm] = useState(product ? { ...product, expiration_date: product.expiration_date || '' } : blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url    = product ? `${API}/products/${product.id}` : `${API}/products`;
      const method = product ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reorder_threshold: parseInt(form.reorder_threshold) || 0,
          current_stock:     parseInt(form.current_stock) || 0,
          expiration_date:   form.expiration_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>Product Name *</label>
            <input className={input} required value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className={label}>SKU *</label>
            <input className={`${input} font-mono`} required value={form.sku} onChange={e => set('sku', e.target.value)} />
          </div>
          <div>
            <label className={label}>Category *</label>
            <select className={input} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Unit of Measure *</label>
            <input className={input} required placeholder="case, kg, unit…" value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)} />
          </div>
          <div>
            <label className={label}>Reorder Threshold</label>
            <input className={input} type="number" min="0" value={form.reorder_threshold} onChange={e => set('reorder_threshold', e.target.value)} />
          </div>
          {!product && (
            <div>
              <label className={label}>Initial Stock</label>
              <input className={input} type="number" min="0" value={form.current_stock} onChange={e => set('current_stock', e.target.value)} />
            </div>
          )}
          <div className={product ? 'col-span-2' : ''}>
            <label className={label}>Expiration Date</label>
            <input className={input} type="date" value={form.expiration_date} onChange={e => set('expiration_date', e.target.value)} />
          </div>
          {error && (
            <div className="col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : product ? 'Update' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Import modal ────────────────────────────────────────────────────────────
const IMPORT_FIELDS = [
  { key: 'name',              required: true,  label: 'Product Name' },
  { key: 'sku',               required: true,  label: 'SKU' },
  { key: 'category',          required: true,  label: 'Category (Dry Goods/Frozen/Mixed)' },
  { key: 'unit_of_measure',   required: true,  label: 'Unit of Measure' },
  { key: 'reorder_threshold', required: true,  label: 'Reorder Threshold' },
  { key: 'current_stock',     required: true,  label: 'Current Stock' },
  { key: 'expiration_date',   required: false, label: 'Expiration Date' },
];

function ImportModal({ onImport, onClose }) {
  const [file,    setFile]    = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step,    setStep]    = useState(1);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const buf = await f.arrayBuffer();
    const wb  = XLSX.read(buf, { type: 'array' });
    const ws  = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (raw.length > 0) {
      const hdrs = raw[0].map(String);
      setHeaders(hdrs);
      // auto-map obvious matches
      const auto = {};
      for (const f of IMPORT_FIELDS) {
        const match = hdrs.find(h =>
          h.toLowerCase().replace(/[^a-z]/g, '') === f.key.replace(/_/g, '')
          || h.toLowerCase().includes(f.key.replace(/_/g, ' ').split(' ')[0])
        );
        if (match) auto[f.key] = match;
      }
      setMapping(auto);
      setStep(2);
    }
  };

  const handleImport = async () => {
    setError('');
    const missing = IMPORT_FIELDS.filter(f => f.required && !mapping[f.key]).map(f => f.label);
    if (missing.length) {
      setError(`Please map required fields: ${missing.join(', ')}`);
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(mapping));
      const res  = await fetch(`${API}/import`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onImport(data.imported);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Import Products</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5">
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload a <strong>CSV</strong> or <strong>Excel (.xlsx)</strong> file. You'll map column names next.
              </p>
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                <span className="text-sm text-gray-500">Click to choose file</span>
                <input type="file" accept=".csv,.xlsx" onChange={handleFile} className="hidden" />
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Map your file's columns to product fields. Auto-detected where possible.
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {IMPORT_FIELDS.map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-44 flex-shrink-0">
                      {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    <select
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      value={mapping[f.key] || ''}
                      onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                    >
                      <option value="">— skip —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {error && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Back
                </button>
                <button onClick={handleImport} disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Products page ──────────────────────────────────────────────────────
export default function Products() {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');

  const fetchProducts = () =>
    fetch(`${API}/products`).then(r => r.json()).then(d => { setProducts(d); setLoading(false); });

  useEffect(() => { fetchProducts(); }, []);

  const openAdd  = () => { setEditing(null); setShowModal(true); };
  const openEdit = (p) => { setEditing(p);   setShowModal(true); };
  const close    = () => { setShowModal(false); setEditing(null); };

  const handleSave = (product) => {
    setProducts(ps =>
      editing ? ps.map(p => p.id === product.id ? product : p) : [...ps, product]
    );
    close();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product and all its stock movement history?')) return;
    await fetch(`${API}/products/${id}`, { method: 'DELETE' });
    setProducts(ps => ps.filter(p => p.id !== id));
  };

  const handleImportDone = (count) => {
    setShowImport(false);
    fetchProducts();
    alert(`Successfully imported / updated ${count} products.`);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(products.map(p => ({
      Name:               p.name,
      SKU:                p.sku,
      Category:           p.category,
      'Unit of Measure':  p.unit_of_measure,
      'Current Stock':    p.current_stock,
      'Reorder Threshold': p.reorder_threshold,
      'Expiration Date':  p.expiration_date || '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const q = search.toLowerCase();
  const filtered = products.filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCat    = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">Products</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
            <Upload size={15} /> Import
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
            <Download size={15} /> Export
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        {(search || catFilter) && (
          <button onClick={() => { setSearch(''); setCatFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left border-b border-gray-100">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">UoM</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Stock</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Reorder At</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.sku}</td>
                <td className="px-4 py-3 text-gray-600">{p.category}</td>
                <td className="px-4 py-3 text-gray-600">{p.unit_of_measure}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">{p.current_stock}</td>
                <td className="px-4 py-3 text-right text-gray-500">{p.reorder_threshold}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.expiration_date || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(p)} title="Edit"
                      className="text-gray-300 hover:text-blue-500 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} title="Delete"
                      className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  {products.length === 0
                    ? 'No products yet — add your first product above.'
                    : 'No products match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400">
            {filtered.length} of {products.length} products
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal product={editing} onSave={handleSave} onClose={close} />
      )}
      {showImport && (
        <ImportModal onImport={handleImportDone} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
