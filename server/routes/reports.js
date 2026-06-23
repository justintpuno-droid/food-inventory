const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/low-stock', (req, res) => {
  const products = db.prepare(`
    SELECT * FROM products
    WHERE current_stock <= reorder_threshold
    ORDER BY (CAST(reorder_threshold AS REAL) - CAST(current_stock AS REAL)) DESC, name COLLATE NOCASE
  `).all();
  res.json(products);
});

router.get('/expiry', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const products = db.prepare(`
    SELECT * FROM products
    WHERE expiration_date IS NOT NULL
      AND expiration_date <= ?
    ORDER BY expiration_date ASC
  `).all(cutoffStr);
  res.json(products);
});

router.get('/movements', (req, res) => {
  const { product_id, start_date, end_date } = req.query;

  let query = `
    SELECT m.*, p.name AS product_name, p.sku, p.unit_of_measure, p.category
    FROM stock_movements m
    JOIN products p ON m.product_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (product_id) { query += ' AND m.product_id = ?'; params.push(product_id); }
  if (start_date) { query += ' AND date(m.created_at) >= ?'; params.push(start_date); }
  if (end_date)   { query += ' AND date(m.created_at) <= ?'; params.push(end_date); }

  query += ' ORDER BY m.created_at DESC';

  const movements = db.prepare(query).all(...params);
  res.json(movements);
});

module.exports = router;
