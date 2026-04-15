const express = require('express');
const QRCode = require('qrcode');
const { db } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/stands
router.get('/', authMiddleware, (req, res) => {
  try {
    const stands = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM product_stands ps WHERE ps.stand_id = s.id AND ps.quantity > 0) as product_count,
        (SELECT COALESCE(SUM(ps.quantity), 0) FROM product_stands ps WHERE ps.stand_id = s.id) as total_items
      FROM stands s
      ORDER BY s.code
    `).all();
    res.json(stands);
  } catch (err) {
    console.error('Get stands error:', err);
    res.status(500).json({ error: 'Error al obtener stands' });
  }
});

// GET /api/stands/:id
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const stand = db.prepare('SELECT * FROM stands WHERE id = ?').get(req.params.id);
    if (!stand) {
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    const products = db.prepare(`
      SELECT ps.quantity, ps.batch_id, p.id as product_id, p.name, p.sku, p.image_url, p.total_stock, p.unit_price,
             c.name as category_name, c.color as category_color,
             b.batch_number, b.created_at as batch_created
      FROM product_stands ps
      JOIN products p ON ps.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN batches b ON ps.batch_id = b.id
      WHERE ps.stand_id = ?
      ORDER BY p.name, b.created_at ASC
    `).all(req.params.id);

    res.json({ ...stand, products });
  } catch (err) {
    console.error('Get stand error:', err);
    res.status(500).json({ error: 'Error al obtener stand' });
  }
});

// GET /api/stands/scan/:code - Scan QR code of stand
router.get('/scan/:code', authMiddleware, (req, res) => {
  try {
    const stand = db.prepare('SELECT * FROM stands WHERE code = ?').get(req.params.code);
    if (!stand) {
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    const products = db.prepare(`
      SELECT ps.quantity, ps.id as ps_id, ps.batch_id, p.id as product_id, p.name, p.sku, p.image_url, p.total_stock, p.unit_price,
             c.name as category_name, c.color as category_color,
             b.batch_number, b.created_at as batch_created
      FROM product_stands ps
      JOIN products p ON ps.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN batches b ON ps.batch_id = b.id
      WHERE ps.stand_id = ?
      ORDER BY p.name, b.created_at ASC
    `).all(stand.id);

    res.json({ ...stand, products });
  } catch (err) {
    console.error('Scan stand error:', err);
    res.status(500).json({ error: 'Error al escanear stand' });
  }
});

// POST /api/stands
router.post('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { code, name, location } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Código y nombre son requeridos' });
    }

    const existing = db.prepare('SELECT id FROM stands WHERE code = ?').get(code);
    if (existing) {
      return res.status(400).json({ error: 'El código de stand ya existe' });
    }

    const qrContent = JSON.stringify({ type: 'stand', code, name });
    const qr_data = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: { dark: '#1A1F2E', light: '#FFFFFF' }
    });

    const result = db.prepare('INSERT INTO stands (code, name, location, qr_data) VALUES (?, ?, ?, ?)').run(
      code, name, location || null, qr_data
    );

    const stand = db.prepare('SELECT * FROM stands WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(stand);
  } catch (err) {
    console.error('Create stand error:', err);
    res.status(500).json({ error: 'Error al crear stand' });
  }
});

// PUT /api/stands/:id
router.put('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { code, name, location } = req.body;
    const stand = db.prepare('SELECT * FROM stands WHERE id = ?').get(req.params.id);
    if (!stand) {
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    // Regenerate QR if code/name changed
    let qr_data = stand.qr_data;
    if ((code && code !== stand.code) || (name && name !== stand.name)) {
      const qrContent = JSON.stringify({ type: 'stand', code: code || stand.code, name: name || stand.name });
      qr_data = await QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 2,
        color: { dark: '#1A1F2E', light: '#FFFFFF' }
      });
    }

    db.prepare('UPDATE stands SET code = ?, name = ?, location = ?, qr_data = ? WHERE id = ?').run(
      code || stand.code,
      name || stand.name,
      location !== undefined ? location : stand.location,
      qr_data,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM stands WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update stand error:', err);
    res.status(500).json({ error: 'Error al actualizar stand' });
  }
});

// DELETE /api/stands/:id
router.delete('/:id', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const stand = db.prepare('SELECT * FROM stands WHERE id = ?').get(req.params.id);
    if (!stand) {
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    db.prepare('DELETE FROM stands WHERE id = ?').run(req.params.id);
    res.json({ message: 'Stand eliminado correctamente' });
  } catch (err) {
    console.error('Delete stand error:', err);
    res.status(500).json({ error: 'Error al eliminar stand' });
  }
});

// POST /api/stands/:id/assign - Assign product to stand (with batch)
router.post('/:id/assign', authMiddleware, roleGuard('admin', 'vendedor'), (req, res) => {
  try {
    const { product_id, quantity, batch_number } = req.body;
    const stand = db.prepare('SELECT * FROM stands WHERE id = ?').get(req.params.id);
    if (!stand) return res.status(404).json({ error: 'Stand no encontrado' });

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    // Handle Batch
    let batchId = null;
    if (batch_number) {
      const existingBatch = db.prepare('SELECT id FROM batches WHERE product_id = ? AND batch_number = ?')
        .get(product_id, batch_number);
      if (existingBatch) {
        batchId = existingBatch.id;
      } else {
        const result = db.prepare('INSERT INTO batches (product_id, batch_number) VALUES (?, ?)')
          .run(product_id, batch_number);
        batchId = result.lastInsertRowid;
      }
    }

    const existing = db.prepare('SELECT * FROM product_stands WHERE product_id = ? AND stand_id = ? AND (batch_id = ? OR (batch_id IS NULL AND ? IS NULL))')
      .get(product_id, req.params.id, batchId, batchId);

    if (existing) {
      db.prepare('UPDATE product_stands SET quantity = ? WHERE id = ?').run(quantity || 0, existing.id);
    } else {
      db.prepare('INSERT INTO product_stands (product_id, stand_id, batch_id, quantity) VALUES (?, ?, ?, ?)').run(
        product_id, req.params.id, batchId, quantity || 0
      );
    }

    res.json({ message: 'Producto asignado al stand correctamente' });
  } catch (err) {
    console.error('Assign product error:', err);
    res.status(500).json({ error: 'Error al asignar producto' });
  }
});

module.exports = router;
