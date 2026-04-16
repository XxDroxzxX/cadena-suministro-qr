const express = require('express');
const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders - List all orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, c.name as customer_name, c.document_id as customer_doc
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows: orderRows } = await pool.query(`
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [req.params.id]);

    if (orderRows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

    const { rows: items } = await pool.query(`
      SELECT oi.*, p.name as product_name, p.sku, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [req.params.id]);

    res.json({ ...orderRows[0], items });
  } catch (err) {
    console.error('Get order detail error:', err);
    res.status(500).json({ error: 'Error al obtener detalle del pedido' });
  }
});

// POST /api/orders - Create new order (Vendedores & Admin)
router.post('/', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer_id, items } = req.body;
    if (!customer_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos de pedido incompletos' });
    }

    await client.query('BEGIN');

    let totalAmount = 0;
    items.forEach(item => { totalAmount += item.quantity * item.unit_price; });

    const { rows: orderRows } = await client.query(`
      INSERT INTO orders (customer_id, status, total_amount)
      VALUES ($1, 'waiting', $2)
      RETURNING *
    `, [customer_id, totalAmount]);

    const orderId = orderRows[0].id;

    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [orderId, item.product_id, item.quantity, item.unit_price]);
    }

    await client.query('COMMIT');
    res.status(201).json(orderRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Error al crear pedido' });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id/dispatch - Dispatch order (Bodeguero & Admin)
router.put('/:id/dispatch', authMiddleware, roleGuard('admin', 'bodeguero'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { carrier, tracking_number } = req.body;
    if (!carrier || !tracking_number) {
      return res.status(400).json({ error: 'Información de despacho (guía y transportadora) requerida' });
    }

    await client.query('BEGIN');

    const { rows: orderRows } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    const order = orderRows[0];

    if (!order) throw new Error('Pedido no encontrado');
    if (order.status !== 'waiting') throw new Error('El pedido ya ha sido procesado');

    const { rows: items } = await client.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);

    // Automatic withdrawal for each item in the order
    for (const item of items) {
      // Logic similar to stock/salida but simplified or reused
      // For simplicity here, we'll implement FIFO withdrawal
      let remainingToWithdraw = item.quantity;
      
      // Check total stock first
      const { rows: pRows } = await client.query('SELECT total_stock FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (pRows[0].total_stock < remainingToWithdraw) {
        throw new Error(`Stock insuficiente para el producto ID ${item.product_id}`);
      }

      // Get available stock in stands (distribution center stage preferred or any)
      const { rows: availablePool } = await client.query(`
        SELECT ps.* FROM product_stands ps
        JOIN batches b ON ps.batch_id = b.id
        WHERE ps.product_id = $1 AND ps.quantity > 0
        ORDER BY b.created_at ASC, ps.id ASC FOR UPDATE OF ps
      `, [item.product_id]);

      const totalInStands = availablePool.reduce((acc, row) => acc + row.quantity, 0);
      if (totalInStands < remainingToWithdraw) {
        throw new Error(`Stock insuficiente en estantes para el producto ID ${item.product_id}`);
      }

      for (const lot of availablePool) {
        if (remainingToWithdraw <= 0) break;
        const take = Math.min(lot.quantity, remainingToWithdraw);
        
        await client.query('UPDATE product_stands SET quantity = quantity - $1 WHERE id = $2', [take, lot.id]);
        
        await client.query(`
          INSERT INTO stock_movements (product_id, stand_id, batch_id, user_id, customer_id, order_id, type, quantity, unit_price, notes)
          VALUES ($1, $2, $3, $4, $5, $6, 'salida', $7, $8, $9)
        `, [item.product_id, lot.stand_id, lot.batch_id, req.user.id, order.customer_id, order.id, take, item.unit_price, 'Despacho de pedido automático']);
        
        remainingToWithdraw -= take;
      }

      await client.query('UPDATE products SET total_stock = total_stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    const { rows: updatedOrder } = await client.query(`
      UPDATE orders 
      SET status = 'dispatched', carrier = $1, tracking_number = $2, dispatched_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [carrier, tracking_number, req.params.id]);

    await client.query('COMMIT');
    res.json(updatedOrder[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Dispatch order error:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
