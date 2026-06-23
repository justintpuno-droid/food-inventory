const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.use('/api/products',  require('./routes/products'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/reports',   require('./routes/reports'));

// CSV / Excel import
app.post('/api/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { buffer, originalname } = req.file;
    const mappings = JSON.parse(req.body.mappings || '{}');

    let workbook;
    if (originalname.toLowerCase().endsWith('.csv')) {
      workbook = XLSX.read(buffer.toString('utf8'), { type: 'string', cellDates: true });
    } else {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd', defval: '' });

    const insert = db.prepare(`
      INSERT INTO products (name, sku, category, unit_of_measure, reorder_threshold, expiration_date, current_stock)
      VALUES (@name, @sku, @category, @unit_of_measure, @reorder_threshold, @expiration_date, @current_stock)
      ON CONFLICT(sku) DO UPDATE SET
        name            = excluded.name,
        category        = excluded.category,
        unit_of_measure = excluded.unit_of_measure,
        reorder_threshold = excluded.reorder_threshold,
        expiration_date = excluded.expiration_date,
        current_stock   = excluded.current_stock,
        updated_at      = datetime('now')
    `);

    const validCategories = new Set(['Dry Goods', 'Frozen', 'Mixed']);

    const importAll = db.transaction((rows) => {
      let count = 0;
      for (const row of rows) {
        const name = String(row[mappings.name] || '').trim();
        const sku  = String(row[mappings.sku]  || '').trim();
        if (!name || !sku) continue;

        const rawCat = String(row[mappings.category] || '').trim();
        const category = validCategories.has(rawCat) ? rawCat : 'Dry Goods';
        const unit_of_measure  = String(row[mappings.unit_of_measure] || 'unit').trim();
        const reorder_threshold = parseInt(row[mappings.reorder_threshold]) || 0;
        const current_stock     = parseInt(row[mappings.current_stock]) || 0;
        const raw_expiry        = mappings.expiration_date ? String(row[mappings.expiration_date] || '').trim() : '';
        const expiration_date   = raw_expiry || null;

        insert.run({ name, sku, category, unit_of_measure, reorder_threshold, expiration_date, current_stock });
        count++;
      }
      return count;
    });

    const imported = importAll(data);
    res.json({ success: true, imported });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
