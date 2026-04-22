const express = require('express');
const QRCode = require('qrcode');
const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/stands
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM product_stands ps WHERE ps.stand_id = s.id AND ps.quantity > 0) as product_count,
        (SELECT COALESCE(SUM(ps.quantity), 0) FROM product_stands ps WHERE ps.stand_id = s.id) as total_items
      FROM stands s
      ORDER BY s.code
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get stands error:', err);
    res.status(500).json({ error: 'Error al obtener stands' });
  }
});

// GET /api/stands/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows: standRows } = await pool.query('SELECT * FROM stands WHERE id = $1', [req.params.id]);
    const stand = standRows[0];
    if (!stand) {
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    const { rows: productRows } = await pool.query(`
      SELECT ps.quantity, ps.batch_id, p.id as product_id, p.name, p.sku, p.image_url, p.total_stock, p.unit_price,
             c.name as category_name, c.color as category_color,
             b.batch_number, b.created_at as batch_created
      FROM product_stands ps
      JOIN products p ON ps.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN batches b ON ps.batch_id = b.id
      WHERE ps.stand_id = $1
      ORDER BY p.name, b.created_at ASC
    `, [req.params.id]);

    res.json({ ...stand, products: productRows });
  } catch (err) {
    console.error('Get stand error:', err);
    res.status(500).json({ error: 'Error al obtener stand' });
  }
});

// GET /api/stands/scan/:code - Scan QR code of stand
router.get('/scan/:code', authMiddleware, async (req, res) => {
  try {
    const { rows: standRows } = await pool.query('SELECT * FROM stands WHERE code = $1', [req.params.code]);
    const stand = standRows[0];
    if (!stand) {
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    const { rows: productRows } = await pool.query(`
      SELECT ps.quantity, ps.id as ps_id, ps.batch_id, p.id as product_id, p.name, p.sku, p.image_url, p.total_stock, p.unit_price,
             c.name as category_name, c.color as category_color,
             b.batch_number, b.created_at as batch_created
      FROM product_stands ps
      JOIN products p ON ps.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN batches b ON ps.batch_id = b.id
      WHERE ps.stand_id = $1
      ORDER BY p.name, b.created_at ASC
    `, [stand.id]);

    res.json({ ...stand, products: productRows });
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

    const { rows: existingRows } = await pool.query('SELECT id FROM stands WHERE code = $1', [code]);
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'El código de stand ya existe' });
    }

    const qrContent = JSON.stringify({ type: 'stand', code, name });
    const qr_data = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: { dark: '#1A1F2E', light: '#FFFFFF' }
    });

    const { rows } = await pool.query(
      'INSERT INTO stands (code, name, location, qr_data) VALUES ($1, $2, $3, $4) RETURNING *',
      [code, name, location || null, qr_data]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create stand error:', err);
    res.status(500).json({ error: 'Error al crear stand' });
  }
});

// PUT /api/stands/:id
router.put('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { code, name, location } = req.body;
    const { rows: standRows } = await pool.query('SELECT * FROM stands WHERE id = $1', [req.params.id]);
    const stand = standRows[0];
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

    const { rows } = await pool.query(
      'UPDATE stands SET code = $1, name = $2, location = $3, qr_data = $4 WHERE id = $5 RETURNING *',
      [
        code || stand.code,
        name || stand.name,
        location !== undefined ? location : stand.location,
        qr_data,
        req.params.id
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Update stand error:', err);
    res.status(500).json({ error: 'Error al actualizar stand' });
  }
});

// DELETE /api/stands/:id
router.delete('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id FROM stands WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    await pool.query('DELETE FROM stands WHERE id = $1', [req.params.id]);
    res.json({ message: 'Stand eliminado correctamente' });
  } catch (err) {
    console.error('Delete stand error:', err);
    res.status(500).json({ error: 'Error al eliminar stand' });
  }
});

// POST /api/stands/:id/assign - Assign product to stand (with batch)
router.post('/:id/assign', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_id, quantity, batch_number } = req.body;
    
    await client.query('BEGIN');

    const { rows: standRows } = await client.query('SELECT * FROM stands WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (standRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Stand no encontrado' });
    }

    const { rows: productRows } = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [product_id]);
    const product = productRows[0];
    if (!product) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Handle Batch
    let batchId = null;
    if (batch_number) {
      const { rows: batchRows } = await client.query('SELECT id FROM batches WHERE product_id = $1 AND batch_number = $2', [product_id, batch_number]);
      if (batchRows.length > 0) {
        batchId = batchRows[0].id;
      } else {
        const { rows: newBatchRows } = await client.query('INSERT INTO batches (product_id, batch_number) VALUES ($1, $2) RETURNING id', [product_id, batch_number]);
        batchId = newBatchRows[0].id;
      }
    }

    const { rows: existingRows } = await client.query(
      'SELECT * FROM product_stands WHERE product_id = $1 AND stand_id = $2 AND (batch_id = $3 OR (batch_id IS NULL AND $3 IS NULL)) FOR UPDATE',
      [product_id, req.params.id, batchId]
    );

    if (existingRows.length > 0) {
      await client.query('UPDATE product_stands SET quantity = $1 WHERE id = $2', [quantity || 0, existingRows[0].id]);
    } else {
      await client.query('INSERT INTO product_stands (product_id, stand_id, batch_id, quantity) VALUES ($1, $2, $3, $4)', [
        product_id, req.params.id, batchId, quantity || 0
      ]);
    }

    // CRITICAL: Recalculate total_stock for the product
    const { rows: stockSumRows } = await client.query(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM product_stands WHERE product_id = $1',
      [product_id]
    );
    const newTotalStock = stockSumRows[0].total;

    await client.query('UPDATE products SET total_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newTotalStock, product_id]);

    // Log movement
    await client.query(`
      INSERT INTO stock_movements (product_id, stand_id, batch_id, user_id, type, quantity, notes)
      VALUES ($1, $2, $3, $4, 'ajuste', $5, $6)
    `, [product_id, req.params.id, batchId, req.user.id, quantity || 0, 'Ajuste manual de stock en estante/lote']);

    await client.query('COMMIT');
    res.json({ message: 'Producto asignado al stand y stock sincronizado correctamente', total_stock: newTotalStock });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign product error:', err);
    res.status(500).json({ error: 'Error al asignar producto y sincronizar stock' });
  } finally {
    client.release();
  }
});

module.exports = router;
