import { useState, useEffect } from 'react';
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';

const API = '/api';
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const label = 'block text-xs font-medium text-gray-600 mb-1';

function MovementModal({ products, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    product_id:     products[0]?.id ?? '',
    type:           'IN',
    quantity:       '',
    supplier:       '',
    destination:    '',
    date_received:  today,
    date_dispatched: today,
    expiration_date: '',
    notes:          '',
  });
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const currentProduct = products.find(p => String(p.id) === String(form.product_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantity || parseInt(form.quantity) <= 0) {
      setError('Quantity must be a positive number');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: parseInt(form.quantity) }),
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

  const isIN  = form.type === 'IN';
  const accentCls = isIN
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-rose-600 hover:bg-rose-700';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Log Stock Movement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-2 gap-4">
          {/* Type toggle */}
          <div className="col-span-2">
            <label className={label}>Movement Type</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {['IN', 'OUT'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    form.type === t
                      ? t === 'IN' ? 'bg-green-600 text-white' : 'bg-rose-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t === 'IN' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                  {t === 'IN' ? 'IN — Shipment' : 'OUT — Order'}
                </button>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="col-span-2">
            <label className={label}>Product *</label>
            <select className={input} required value={form.product_id} onChange={e => set('product_id', e.target.value)}>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — stock: {p.current_stock} {p.unit_of_measure}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className={label}>Quantity *</label>
            <input className={input} type="number" min="1" required placeholder="0"
              value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            {form.type === 'OUT' && currentProduct && (
              <p className="text-xs text-gray-400 mt-1">
                Available: {currentProduct.current_stock} {currentProduct.unit_of_measure}
              </p>
            )}
          </div>

          {/* Supplier / Destination */}
          {isIN ? (
            <div>
              <label className={label}>Supplier</label>
              <input className={input} placeholder="Supplier name"
                value={form.supplier} onChange={e => set('supplier', e.target.value)} />
            </div>
          ) : (
            <div>
              <label className={label}>Destination</label>
              <input className={input} placeholder="Customer / route"
                value={form.destination} onChange={e => set('destination', e.target.value)} />
            </div>
          )}

          {/* Date */}
          {isIN ? (
            <div>
              <label className={label}>Date Received</label>
              <input className={input} type="date"
                value={form.date_received} onChange={e => set('date_received', e.target.value)} />
            </div>
          ) : (
            <div>
              <label className={label}>Date Dispatched</label>
              <input className={input} type="date"
                value={form.date_dispatched} onChange={e => set('date_dispatched', e.target.value)} />
            </div>
          )}

          {/* Expiry (only for IN) */}
          {isIN && (
            <div>
              <label className={label}>Batch Expiry Date</label>
              <input className={input} type="date"
                value={form.expiration_date} onChange={e => set('expiration_date', e.target.value)} />
            </div>
          )}

          {/* Notes */}
          <div className="col-span-2">
            <label className={label}>Notes</label>
            <textarea className={input} rows={2} placeholder="Optional notes…"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
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
              className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${accentCls}`}>
              {saving ? 'Saving…' : isIN ? 'Log Shipment' : 'Log Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockMovements() {
  const [movements,  setMovements]  = useState([]);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterProd, setFilterProd] = useState('');

  const fetchMovements = (type = filterType, prod = filterProd) => {
    const p = new URLSearchParams();
    if (type) p.set('type',       type);
    if (prod) p.set('product_id', prod);
    fetch(`${API}/movements?${p}`)
      .then(r => r.json())
      .then(d => { setMovements(d); setLoading(false); });
  };

  useEffect(() => {
    fetch(`${API}/products`).then(r => r.json()).then(setProducts);
    fetchMovements();
  }, []);

  const applyFilter = () => fetchMovements(filterType, filterProd);

  const handleSave = (movement) => {
    setMovements(ms => [movement, ...ms]);
    setShowModal(false);
    // refresh products to reflect updated stock
    fetch(`${API}/products`).then(r => r.json()).then(setProducts);
  };

  const noProducts = products.length === 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">Stock Movements</h1>
        <button
          onClick={() => setShowModal(true)}
          title={noProducts ? 'Add products first' : undefined}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={15} /> Log Movement
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="IN">IN (Shipments)</option>
          <option value="OUT">OUT (Orders)</option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filterProd}
          onChange={e => setFilterProd(e.target.value)}
        >
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          onClick={applyFilter}
          className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
        >
          Apply
        </button>
        {(filterType || filterProd) && (
          <button
            onClick={() => { setFilterType(''); setFilterProd(''); fetchMovements('', ''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left border-b border-gray-100">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Qty</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier / Dest.</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Logged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {movements.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    m.type === 'IN'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {m.type === 'IN' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    {m.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{m.product_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{m.sku}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {m.quantity}
                  <span className="text-gray-400 font-normal text-xs ml-1">{m.unit_of_measure}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{m.supplier || m.destination || '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{m.date_received || m.date_dispatched || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.expiration_date || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{m.notes || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
            {movements.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  {noProducts
                    ? 'Add products first, then log movements here.'
                    : 'No movements found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {movements.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400">
            {movements.length} entries
          </div>
        )}
      </div>

      {showModal && !noProducts && (
        <MovementModal products={products} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
      {showModal && noProducts && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm text-center">
            <p className="text-gray-700 mb-4">Please add products first before logging stock movements.</p>
            <button onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
