const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE').all();
  res.json(products);
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/', (req, res) => {
  const { name, sku, category, unit_of_measure, reorder_threshold, expiration_date, current_stock } = req.body;
  if (!name || !sku || !category || !unit_of_measure) {
    return res.status(400).json({ error: 'name, sku, category, and unit_of_measure are required' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO products (name, sku, category, unit_of_measure, reorder_threshold, expiration_date, current_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, sku, category, unit_of_measure, reorder_threshold || 0, expiration_date || null, current_stock || 0);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: `SKU "${sku}" already exists` });
    }
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { name, sku, category, unit_of_measure, reorder_threshold, expiration_date } = req.body;
  try {
    const info = db.prepare(`
      UPDATE products
      SET name = ?, sku = ?, category = ?, unit_of_measure = ?,
          reorder_threshold = ?, expiration_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, sku, category, unit_of_measure, reorder_threshold, expiration_date || null, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Product not found' });
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: `SKU "${sku}" already exists` });
    }
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const del = db.transaction(() => {
    db.prepare('DELETE FROM stock_movements WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  });
  del();
  res.json({ success: true });
});

module.exports = router;
