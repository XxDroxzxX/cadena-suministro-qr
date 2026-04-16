const express = require('express');
const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/suppliers - List all suppliers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM suppliers WHERE active = 1 ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get suppliers error:', err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// POST /api/suppliers - Create supplier (Admin only)
router.post('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { name, contact_name, email, phone, address } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO suppliers (name, contact_name, email, phone, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, contact_name, email, phone, address]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// GET /api/suppliers/orders - List all supplier orders
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT so.*, s.name as supplier_name
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.id
      ORDER BY so.ordered_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get supplier orders error:', err);
    res.status(500).json({ error: 'Error al obtener pedidos a proveedores' });
  }
});

// POST /api/suppliers/orders - Create order to supplier
router.post('/orders', authMiddleware, roleGuard('admin', 'bodeguero'), async (req, res) => {
  try {
    const { supplier_id, expected_at, notes } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO supplier_orders (supplier_id, expected_at, notes, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [supplier_id, expected_at, notes]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create supplier order error:', err);
    res.status(500).json({ error: 'Error al crear pedido a proveedor' });
  }
});

// PUT /api/suppliers/orders/:id/ship - Mark as shipped
router.put('/orders/:id/ship', authMiddleware, roleGuard('admin', 'bodeguero'), async (req, res) => {
  try {
    const { tracking_number, carrier, gps_link } = req.body;
    const { rows } = await pool.query(`
      UPDATE supplier_orders 
      SET status = 'shipped', tracking_number = $1, carrier = $2, gps_link = $3
      WHERE id = $4
      RETURNING *
    `, [tracking_number, carrier, gps_link, req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Ship supplier order error:', err);
    res.status(500).json({ error: 'Error al actualizar despacho' });
  }
});

// PUT /api/suppliers/orders/:id/deliver - Mark as delivered and update stock/KPIs
router.put('/orders/:id/deliver', authMiddleware, roleGuard('admin', 'bodeguero'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { quality_rating, environmental_rating, product_id, quantity, batch_number, stand_id } = req.body;
    
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query('SELECT * FROM supplier_orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    const order = orderRows[0];
    if (!order) throw new Error('Pedido no encontrado');
    if (order.status === 'delivered') throw new Error('El pedido ya fue marcado como entregado');

    // Update Order Status
    await client.query(`
      UPDATE supplier_orders 
      SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    // Update Supplier KPIs (Average)
    await client.query(`
      UPDATE suppliers 
      SET quality_rating = (quality_rating + $1) / 2,
          environmental_rating = (environmental_rating + $2) / 2
      WHERE id = $3
    `, [quality_rating || 5, environmental_rating || 5, order.supplier_id]);

    // Automatic Stock Intake (if product info provided)
    if (product_id && quantity) {
      // 1. Handle Batch
      let batchId = null;
      if (batch_number) {
        const { rows: bRows } = await client.query('SELECT id FROM batches WHERE product_id = $1 AND batch_number = $2', [product_id, batch_number]);
        if (bRows.length > 0) batchId = bRows[0].id;
        else {
          const { rows: newB } = await client.query('INSERT INTO batches (product_id, batch_number) VALUES ($1, $2) RETURNING id', [product_id, batch_number]);
          batchId = newB[0].id;
        }
      }

      // 2. Update Total Stock
      await client.query('UPDATE products SET total_stock = total_stock + $1 WHERE id = $2', [quantity, product_id]);

      // 3. Update Stand (defaults to raw material stage stand or specific one)
      const { rows: psRows } = await client.query(`
        SELECT * FROM product_stands 
        WHERE product_id = $1 AND stand_id = $2 
        AND (batch_id = $3 OR (batch_id IS NULL AND $3 IS NULL))
      `, [product_id, stand_id, batchId]);

      if (psRows.length > 0) {
        await client.query('UPDATE product_stands SET quantity = quantity + $1 WHERE id = $2', [quantity, psRows[0].id]);
      } else {
        await client.query('INSERT INTO product_stands (product_id, stand_id, batch_id, quantity) VALUES ($1, $2, $3, $4)', [product_id, stand_id, batchId, quantity]);
      }

      // 4. Log Movement
      await client.query(`
        INSERT INTO stock_movements (product_id, stand_id, batch_id, user_id, supplier_order_id, type, quantity, notes)
        VALUES ($1, $2, $3, $4, $5, 'entrada', $6, 'Entrada automática por pedido a proveedor')
      `, [product_id, stand_id, batchId, req.user.id, order.id, quantity]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Pedido entregado y stock actualizado' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Deliver supplier order error:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
