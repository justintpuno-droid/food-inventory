import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import Papa from 'papaparse';

const API = '/api';

function downloadCSV(rows, filename) {
  const csv  = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportTable({ columns, rows, emptyMsg = 'No data for this report.' }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
        {emptyMsg}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left border-b border-gray-100">
            {columns.map((col, i) => (
              <th key={i} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400">
        {rows.length} row{rows.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ── Low Stock Report ────────────────────────────────────────────────────────
function LowStockReport() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${API}/reports/low-stock`).then(r => r.json()).then(setData);
  }, []);

  const exportCSV = () =>
    downloadCSV(data.map(p => ({
      Name:               p.name,
      SKU:                p.sku,
      Category:           p.category,
      Unit:               p.unit_of_measure,
      'Current Stock':    p.current_stock,
      'Reorder Threshold': p.reorder_threshold,
      Deficit:            Math.max(0, p.reorder_threshold - p.current_stock),
      'Expiry Date':      p.expiration_date || '',
    })), 'low-stock-report.csv');

  const columns = ['Product', 'SKU', 'Category', 'Current Stock', 'Reorder At', 'Deficit'];
  const rows = data.map(p => [
    p.name,
    <span className="font-mono text-xs text-gray-400">{p.sku}</span>,
    p.category,
    <span className="font-semibold">{p.current_stock} <span className="text-gray-400 font-normal text-xs">{p.unit_of_measure}</span></span>,
    p.reorder_threshold,
    <span className="font-semibold text-red-600">{Math.max(0, p.reorder_threshold - p.current_stock)}</span>,
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          <strong className="text-gray-800">{data.length}</strong> product{data.length !== 1 ? 's' : ''} at or below reorder threshold
        </p>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download size={14} /> Export CSV
        </button>
      </div>
      <ReportTable columns={columns} rows={rows} emptyMsg="All products are above reorder threshold." />
    </div>
  );
}

// ── Expiry Report ───────────────────────────────────────────────────────────
function ExpiryReport() {
  const [data, setData]    = useState([]);
  const [days, setDays]    = useState('30');

  useEffect(() => {
    fetch(`${API}/reports/expiry?days=${days}`).then(r => r.json()).then(setData);
  }, [days]);

  const exportCSV = () =>
    downloadCSV(data.map(p => ({
      Name:            p.name,
      SKU:             p.sku,
      Category:        p.category,
      'Current Stock': p.current_stock,
      'Unit':          p.unit_of_measure,
      'Expiry Date':   p.expiration_date,
      Status:          daysUntil(p.expiration_date) < 0 ? 'Expired' : `Expires in ${daysUntil(p.expiration_date)} days`,
    })), `expiry-report-${days}d.csv`);

  const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 864e5);

  const columns = ['Product', 'SKU', 'Category', 'Stock', 'Expiry Date', 'Status'];
  const rows = data.map(p => {
    const d = daysUntil(p.expiration_date);
    return [
      p.name,
      <span className="font-mono text-xs text-gray-400">{p.sku}</span>,
      p.category,
      `${p.current_stock} ${p.unit_of_measure}`,
      p.expiration_date,
      d < 0
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Expired {Math.abs(d)}d ago</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Expires in {d}d</span>,
    ];
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Products expiring within</span>
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={days}
            onChange={e => setDays(e.target.value)}
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
          <span className="text-sm text-gray-500">
            — <strong className="text-gray-800">{data.length}</strong> found
          </span>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download size={14} /> Export CSV
        </button>
      </div>
      <ReportTable columns={columns} rows={rows} emptyMsg={`No products expiring within ${days} days.`} />
    </div>
  );
}

// ── Movement Report ─────────────────────────────────────────────────────────
function MovementReport() {
  const [products, setProducts] = useState([]);
  const [data,     setData]     = useState([]);
  const [loaded,   setLoaded]   = useState(false);
  const [filter, setFilter] = useState({ product_id: '', start_date: '', end_date: '' });

  useEffect(() => {
    fetch(`${API}/products`).then(r => r.json()).then(setProducts);
  }, []);

  const fetchData = useCallback(() => {
    const p = new URLSearchParams(
      Object.fromEntries(Object.entries(filter).filter(([, v]) => v))
    );
    fetch(`${API}/reports/movements?${p}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoaded(true); });
  }, [filter]);

  useEffect(() => { fetchData(); }, []);

  const exportCSV = () =>
    downloadCSV(data.map(m => ({
      Type:            m.type,
      Product:         m.product_name,
      SKU:             m.sku,
      Category:        m.category,
      Quantity:        m.quantity,
      Unit:            m.unit_of_measure,
      'Supplier/Dest': m.supplier || m.destination || '',
      Date:            m.date_received || m.date_dispatched || '',
      Notes:           m.notes || '',
      'Logged At':     m.created_at,
    })), 'movement-report.csv');

  const columns = ['Type', 'Product', 'Qty', 'Supplier / Dest.', 'Date', 'Notes', 'Logged'];
  const rows = data.map(m => [
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      m.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
    }`}>{m.type}</span>,
    <span>
      <span className="font-medium text-gray-800">{m.product_name}</span>
      <span className="ml-1 font-mono text-xs text-gray-400">{m.sku}</span>
    </span>,
    `${m.quantity} ${m.unit_of_measure}`,
    m.supplier || m.destination || '—',
    m.date_received || m.date_dispatched || '—',
    <span className="text-xs text-gray-500 max-w-[160px] block truncate">{m.notes || '—'}</span>,
    <span className="text-xs text-gray-400 whitespace-nowrap">
      {new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
    </span>,
  ]);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filter.product_id}
          onChange={e => setFilter(f => ({ ...f, product_id: e.target.value }))}
        >
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filter.start_date}
          onChange={e => setFilter(f => ({ ...f, start_date: e.target.value }))} />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filter.end_date}
          onChange={e => setFilter(f => ({ ...f, end_date: e.target.value }))} />
        <button onClick={fetchData}
          className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
          Apply
        </button>
        <div className="ml-auto">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>
      {loaded && (
        <ReportTable columns={columns} rows={rows} emptyMsg="No movements match these filters." />
      )}
    </div>
  );
}

// ── Main Reports page ───────────────────────────────────────────────────────
const TABS = [
  { id: 'low-stock',  label: 'Low Stock Report' },
  { id: 'expiry',     label: 'Expiry Report' },
  { id: 'movements',  label: 'Movement Report' },
];

export default function Reports() {
  const [tab, setTab] = useState('low-stock');

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-5">Reports</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'low-stock'  && <LowStockReport />}
      {tab === 'expiry'     && <ExpiryReport />}
      {tab === 'movements'  && <MovementReport />}
    </div>
  );
}
