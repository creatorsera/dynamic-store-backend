const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('./auth');
const { pool } = require('../database');

function safe(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
  return val;
}

// ── GET /api/products ── public
router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products WHERE active=TRUE ORDER BY created_at DESC');
    res.json({ products: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── GET /api/products/all ── admin
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ products: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── GET /api/products/:id ── single product (public)
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products WHERE id=$1 AND active=TRUE', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ── POST /api/products ── admin: create
router.post('/', requireAdmin, async (req, res) => {
  const { name, base_price, category, badge, piece_type, pieces, variants, sizes, low_stock } = req.body;

  if (!name?.trim())     return res.status(400).json({ error: 'Name is required' });
  if (!base_price && base_price !== 0) return res.status(400).json({ error: 'Base price is required' });
  if (!category?.trim()) return res.status(400).json({ error: 'Category is required' });

  try {
    const r = await pool.query(
      `INSERT INTO products (name, base_price, category, badge, piece_type, pieces, variants, sizes, low_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        name.trim(),
        parseInt(base_price) || 0,
        category.trim(),
        badge?.trim() || null,
        piece_type || '1-piece',
        JSON.stringify(safe(pieces)),
        JSON.stringify(safe(variants)),
        JSON.stringify(safe(sizes)),
        low_stock === true || low_stock === 'true',
      ]
    );
    res.json({ success: true, product: r.rows[0] });
  } catch (err) {
    console.error('INSERT error:', err.message);
    res.status(500).json({ error: 'Failed to add product: ' + err.message });
  }
});

// ── PUT /api/products/:id ── admin: update
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, base_price, category, badge, piece_type, pieces, variants, sizes, low_stock, active } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Product not found' });
    const p = existing.rows[0];

    const r = await pool.query(
      `UPDATE products SET
        name       = $1, base_price = $2, category  = $3,
        badge      = $4, piece_type = $5, pieces    = $6,
        variants   = $7, sizes      = $8, low_stock = $9, active = $10
       WHERE id = $11 RETURNING *`,
      [
        name?.trim()    || p.name,
        base_price !== undefined ? parseInt(base_price) : p.base_price,
        category?.trim() || p.category,
        badge !== undefined ? (badge?.trim() || null) : p.badge,
        piece_type || p.piece_type,
        pieces    !== undefined ? JSON.stringify(safe(pieces))   : p.pieces,
        variants  !== undefined ? JSON.stringify(safe(variants)) : p.variants,
        sizes     !== undefined ? JSON.stringify(safe(sizes))    : p.sizes,
        low_stock !== undefined ? (low_stock === true || low_stock === 'true') : p.low_stock,
        active    !== undefined ? (active    === true || active    === 'true') : p.active,
        parseInt(req.params.id),
      ]
    );
    res.json({ success: true, product: r.rows[0] });
  } catch (err) {
    console.error('UPDATE error:', err.message);
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

// ── DELETE /api/products/:id ── soft delete
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE products SET active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
