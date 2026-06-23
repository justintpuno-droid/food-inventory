import { useState } from 'react';
import { LayoutDashboard, Package, ArrowLeftRight, FileBarChart, Menu, X, Box } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'products',  label: 'Products',          icon: Package },
  { id: 'movements', label: 'Stock Movements',   icon: ArrowLeftRight },
  { id: 'reports',   label: 'Reports',           icon: FileBarChart },
];

export default function Layout({ page, setPage, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside
        className={`${collapsed ? 'w-14' : 'w-56'} flex-shrink-0 bg-gray-900 text-white flex flex-col transition-all duration-200`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-4 border-b border-gray-700`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Box size={18} className="text-blue-400" />
              <span className="font-semibold text-sm tracking-wide">FoodInv</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        <nav className="flex-1 py-3">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                ${page === id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className={`px-3 py-3 border-t border-gray-700 text-xs text-gray-500 ${collapsed ? 'hidden' : ''}`}>
          Local Inventory v1.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
