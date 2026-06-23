const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { product_id, type, start_date, end_date } = req.query;

  let query = `
    SELECT m.*, p.name AS product_name, p.sku, p.unit_of_measure
    FROM stock_movements m
    JOIN products p ON m.product_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (product_id) { query += ' AND m.product_id = ?'; params.push(product_id); }
  if (type)       { query += ' AND m.type = ?';       params.push(type); }
  if (start_date) { query += ' AND date(m.created_at) >= ?'; params.push(start_date); }
  if (end_date)   { query += ' AND date(m.created_at) <= ?'; params.push(end_date); }

  query += ' ORDER BY m.created_at DESC';

  const movements = db.prepare(query).all(...params);
  res.json(movements);
});

router.post('/', (req, res) => {
  const { product_id, type, quantity, supplier, destination, date_received, date_dispatched, expiration_date, notes } = req.body;

  if (!product_id || !type || !quantity) {
    return res.status(400).json({ error: 'product_id, type, and quantity are required' });
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (type === 'OUT' && product.current_stock < qty) {
    return res.status(400).json({
      error: `Insufficient stock — available: ${product.current_stock} ${product.unit_of_measure}`,
    });
  }

  const addMovement = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, supplier, destination, date_received, date_dispatched, expiration_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id, type, qty,
      supplier || null, destination || null,
      date_received || null, date_dispatched || null,
      expiration_date || null, notes || null,
    );

    const delta = type === 'IN' ? qty : -qty;
    db.prepare(`UPDATE products SET current_stock = current_stock + ?, updated_at = datetime('now') WHERE id = ?`)
      .run(delta, product_id);

    return db.prepare(`
      SELECT m.*, p.name AS product_name, p.sku, p.unit_of_measure
      FROM stock_movements m
      JOIN products p ON m.product_id = p.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);
  });

  res.status(201).json(addMovement());
});

module.exports = router;
