# Food Inventory Manager

Local inventory management for food distribution. Runs entirely on your machine — no internet, no auth, no cloud.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend  | Node.js, Express |
| Database | SQLite via better-sqlite3 |
| Excel I/O | SheetJS (xlsx) |
| CSV export | PapaParse |

---

## Setup

### Prerequisites

- **Node.js 18+** (`node -v` to check)
- **npm 9+**
- macOS: Xcode Command Line Tools — needed to compile `better-sqlite3`
  ```
  xcode-select --install
  ```

### Install

```bash
# from the project root
npm install                          # installs concurrently
cd server && npm install && cd ..    # installs Express + SQLite
cd client && npm install && cd ..    # installs React + Vite + Tailwind
```

Or as a one-liner:
```bash
npm run install:all
```

### Run (development)

```bash
npm run dev
```

Starts:
- **API server** → http://localhost:3001
- **React app**  → http://localhost:3000

Open http://localhost:3000 in your browser.

The SQLite database is created automatically at `server/inventory.db` on first launch.

---

## Features

### Dashboard
- Summary cards: total products, critical stock, low stock, expiry alerts
- Bar chart: current stock vs. reorder threshold (top 20 products)
- Full inventory table with color-coded status badges:
  - **Green — OK**: stock above threshold
  - **Yellow — Low**: within 20% of threshold
  - **Red — Critical**: at or below threshold
- Expiry badges: **orange** (expiring within 30 days), **red** (already expired)

### Products
- Add / edit / delete products
- Fields: name, SKU, category, unit of measure, reorder threshold, expiration date, initial stock
- Search by name or SKU; filter by category
- **Import** from CSV or Excel with a column-mapping UI (auto-detects column names)
- **Export** full inventory snapshot to Excel (.xlsx)

### Stock Movements
- Log **IN** (shipments): supplier, date received, batch expiry date
- Log **OUT** (orders/deliveries): destination, date dispatched
- Stock levels update automatically on save
- Filter log by type or product
- Guard against negative stock on OUT entries

### Reports

| Report | Description |
|--------|-------------|
| Low Stock | All products at or below reorder threshold, sortable by deficit |
| Expiry | Products expiring within 30 / 60 / 90 days (your choice) |
| Movement | Full movement history, filterable by product and date range |

All three reports are exportable to CSV.

---

## Import File Format

CSV or Excel files with any column names — the import UI lets you map them.

Required fields to map:

| Field | Notes |
|-------|-------|
| name | Product name |
| sku | Must be unique; existing SKUs are updated |
| category | `Dry Goods`, `Frozen`, or `Mixed` |
| unit_of_measure | e.g. `case`, `kg`, `unit` |
| reorder_threshold | Number |
| current_stock | Number |

Optional:

| Field | Notes |
|-------|-------|
| expiration_date | YYYY-MM-DD format preferred |

---

## Project Structure

```
food-inventory/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # Dashboard, Products, StockMovements, Reports
│   │   └── components/  # Layout (sidebar)
│   └── vite.config.js   # Proxy /api → localhost:3001
├── server/              # Express + SQLite backend
│   ├── routes/          # products.js, movements.js, reports.js
│   ├── db.js            # Schema init (better-sqlite3)
│   └── index.js         # Express server + import endpoint
└── package.json         # Root: runs both with concurrently
```
