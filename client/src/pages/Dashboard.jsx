import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Package, AlertTriangle, TrendingDown, Clock } from 'lucide-react';

const API = '/api';

function stockStatus(p) {
  if (p.current_stock <= p.reorder_threshold) return 'critical';
  if (p.current_stock <= p.reorder_threshold * 1.2) return 'low';
  return 'ok';
}

function expiryStatus(p) {
  if (!p.expiration_date) return null;
  const days = Math.ceil((new Date(p.expiration_date) - new Date()) / 864e5);
  if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700' };
  if (days <= 30) return { label: `Exp ${days}d`, cls: 'bg-orange-100 text-orange-700' };
  return null;
}

const STATUS_BADGE = {
  critical: { cls: 'bg-red-100 text-red-700',    label: 'Critical' },
  low:      { cls: 'bg-yellow-100 text-yellow-700', label: 'Low' },
  ok:       { cls: 'bg-green-100 text-green-700',  label: 'OK' },
};

function Badge({ cls, label }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const COLORS = {
    blue:   'bg-blue-50 text-blue-600',
    red:    'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${COLORS[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/products`)
      .then(r => r.json())
      .then(d => { setProducts(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading inventory…
      </div>
    );
  }

  const critical     = products.filter(p => stockStatus(p) === 'critical').length;
  const low          = products.filter(p => stockStatus(p) === 'low').length;
  const expiryAlerts = products.filter(p => expiryStatus(p) !== null).length;

  const chartData = products.slice(0, 20).map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    'Current Stock': p.current_stock,
    'Reorder At': p.reorder_threshold,
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Inventory Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package}      label="Total Products"  value={products.length} color="blue" />
        <StatCard icon={TrendingDown} label="Critical Stock"  value={critical}        color="red" />
        <StatCard icon={AlertTriangle} label="Low Stock"      value={low}             color="yellow" />
        <StatCard icon={Clock}        label="Expiry Alerts"   value={expiryAlerts}    color="orange" />
      </div>

      {/* Bar chart */}
      {products.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Current Stock vs Reorder Threshold
            {products.length > 20 && <span className="text-gray-400 font-normal"> (top 20)</span>}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 56 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
              <Bar dataKey="Current Stock" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Reorder At"    fill="#f97316" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Inventory table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Full Inventory Status</h2>
          <span className="text-xs text-gray-400">{products.length} products</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Stock</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Reorder At</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry Date</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => {
                const ss = stockStatus(p);
                const es = expiryStatus(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{p.sku}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                      {p.current_stock} <span className="text-gray-400 text-xs">{p.unit_of_measure}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{p.reorder_threshold}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge cls={STATUS_BADGE[ss].cls} label={STATUS_BADGE[ss].label} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{p.expiration_date || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {es && <Badge cls={es.cls} label={es.label} />}
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No products yet — add some from the Products page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
