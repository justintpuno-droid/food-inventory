import { useState } from 'react';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import StockMovements from './pages/StockMovements.jsx';
import Reports from './pages/Reports.jsx';

const PAGES = {
  dashboard: Dashboard,
  products: Products,
  movements: StockMovements,
  reports: Reports,
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const Page = PAGES[page];
  return (
    <Layout page={page} setPage={setPage}>
      <Page />
    </Layout>
  );
}
