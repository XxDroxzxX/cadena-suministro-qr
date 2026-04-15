const express = require('express');
const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/stock - Get all movements
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { product_id, stand_id, type, date_from, date_to, limit } = req.query;
    let queryStr = `
      SELECT sm.*, p.name as product_name, p.sku,
             s.code as stand_code, s.name as stand_name,
             u.full_name as user_name,
             b.batch_number, c.name as customer_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN stands s ON sm.stand_id = s.id
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN batches b ON sm.batch_id = b.id
      LEFT JOIN customers c ON sm.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      params.push(product_id);
      queryStr += ` AND sm.product_id = $${params.length}`;
    }
    if (stand_id) {
      params.push(stand_id);
      queryStr += ` AND sm.stand_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      queryStr += ` AND sm.type = $${params.length}`;
    }
    if (date_from) {
      params.push(date_from);
      queryStr += ` AND sm.created_at >= $${params.length}`;
    }
    if (date_to) {
      params.push(date_to + ' 23:59:59');
      queryStr += ` AND sm.created_at <= $${params.length}`;
    }

    queryStr += ` ORDER BY sm.created_at DESC`;
    if (limit) {
      params.push(parseInt(limit));
      queryStr += ` LIMIT $${params.length}`;
    }

    const { rows } = await pool.query(queryStr, params);
    res.json(rows);
  } catch (err) {
    console.error('Get movements error:', err);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// POST /api/stock/entrada - Add stock (Vendedor + Admin)
router.post('/entrada', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { product_id, stand_id, quantity, batch_number, notes } = req.body;
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Producto y cantidad válidos son requeridos' });
    }

    const { rows: productRows } = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    const product = productRows[0];
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    // Handle Batch
    let batchId = null;
    if (batch_number) {
      const { rows: batchRows } = await pool.query('SELECT id FROM batches WHERE product_id = $1 AND batch_number = $2', [product_id, batch_number]);
      if (batchRows.length > 0) {
        batchId = batchRows[0].id;
      } else {
        const { rows: newBatchRows } = await pool.query('INSERT INTO batches (product_id, batch_number) VALUES ($1, $2) RETURNING id', [product_id, batch_number]);
        batchId = newBatchRows[0].id;
      }
    }

    // Update total stock
    await pool.query('UPDATE products SET total_stock = total_stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [quantity, product_id]);

    // Update stand quantity if specified
    if (stand_id) {
      // Postgres NULL comparison needs special care or simpler logic
      const { rows: existingRows } = await pool.query(`
        SELECT * FROM product_stands 
        WHERE product_id = $1 AND stand_id = $2 
        AND (batch_id = $3 OR (batch_id IS NULL AND $3 IS NULL))
      `, [product_id, stand_id, batchId]);
      
      if (existingRows.length > 0) {
        await pool.query('UPDATE product_stands SET quantity = quantity + $1 WHERE id = $2', [quantity, existingRows[0].id]);
      } else {
        await pool.query('INSERT INTO product_stands (product_id, stand_id, batch_id, quantity) VALUES ($1, $2, $3, $4)', [product_id, stand_id, batchId, quantity]);
      }
    }

    // Log movement
    await pool.query(`
      INSERT INTO stock_movements (product_id, stand_id, batch_id, user_id, type, quantity, notes)
      VALUES ($1, $2, $3, $4, 'entrada', $5, $6)
    `, [product_id, stand_id || null, batchId, req.user.id, quantity, notes || null]);

    const { rows: updatedRows } = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    res.json({ message: 'Stock agregado correctamente', product: updatedRows[0] });
  } catch (err) {
    console.error('Stock entrada error:', err);
    res.status(500).json({ error: 'Error al agregar stock' });
  }
});

// POST /api/stock/salida - Remove stock (Bodeguero + Admin) - FIFO Implementation
router.post('/salida', authMiddleware, roleGuard('admin', 'bodeguero'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { product_id, stand_id, quantity, notes, customer_id } = req.body;
    let remainingToWithdraw = parseInt(quantity);

    if (!product_id || !remainingToWithdraw || remainingToWithdraw <= 0) {
      throw new Error('Producto y cantidad válidos son requeridos');
    }

    const { rows: productRows } = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [product_id]);
    const product = productRows[0];
    if (!product) throw new Error('Producto no encontrado');

    if (parseFloat(product.total_stock) < remainingToWithdraw) {
      throw new Error('Stock insuficiente en sistema');
    }

    // FIFO Logic: Get oldest batches in this stand (if specified) or across all stands
    let queryStr = `
      SELECT ps.*, b.batch_number, b.created_at as batch_created
      FROM product_stands ps
      LEFT JOIN batches b ON ps.batch_id = b.id
      WHERE ps.product_id = $1 AND ps.quantity > 0
    `;
    const params = [product_id];

    if (stand_id) {
      params.push(stand_id);
      queryStr += ` AND ps.stand_id = $${params.length}`;
    }

    // Sort by batch creation date (oldest first)
    queryStr += ` ORDER BY b.created_at ASC, ps.id ASC FOR UPDATE`;

    const { rows: availableRows } = await client.query(queryStr, params);
    const totalAvailable = availableRows.reduce((sum, item) => sum + parseFloat(item.quantity), 0);

    if (totalAvailable < remainingToWithdraw) {
      throw new Error(stand_id ? 'Stock insuficiente en este stand' : 'Stock insuficiente en bodega');
    }

    // Deduct from batches one by one
    for (const lot of availableRows) {
      if (remainingToWithdraw <= 0) break;

      const take = Math.min(parseFloat(lot.quantity), remainingToWithdraw);
      
      // Update stand quantity
      await client.query('UPDATE product_stands SET quantity = quantity - $1 WHERE id = $2', [take, lot.id]);

      // Log detailed movement for this batch
      await client.query(`
        INSERT INTO stock_movements (product_id, stand_id, batch_id, user_id, customer_id, type, quantity, unit_price, notes)
        VALUES ($1, $2, $3, $4, $5, 'salida', $6, $7, $8)
      `, [product_id, lot.stand_id, lot.batch_id, req.user.id, customer_id || null, take, product.unit_price || 0, notes || `Salida FIFO (Lote: ${lot.batch_number || 'S/L'})`]);

      remainingToWithdraw -= take;
    }

    // Update total product stock
    await client.query('UPDATE products SET total_stock = total_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [quantity, product_id]);

    const { rows: finalRows } = await client.query('SELECT * FROM products WHERE id = $1', [product_id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Stock retirado correctamente (FIFO)', product: finalRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Stock salida error:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/stock/dashboard - Dashboard stats
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const { rows: pCount } = await pool.query('SELECT COUNT(*) as count FROM products');
    const { rows: sSum } = await pool.query('SELECT COALESCE(SUM(total_stock), 0) as total FROM products');
    const { rows: lCount } = await pool.query('SELECT COUNT(*) as count FROM products WHERE total_stock <= min_stock');
    const { rows: stCount } = await pool.query('SELECT COUNT(*) as count FROM stands');
    const { rows: uCount } = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = 1');

    const { rows: recentMovements } = await pool.query(`
      SELECT sm.*, p.name as product_name, p.sku,
             s.code as stand_code, u.full_name as user_name,
             b.batch_number, c.name as customer_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN stands s ON sm.stand_id = s.id
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN batches b ON sm.batch_id = b.id
      LEFT JOIN customers c ON sm.customer_id = c.id
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);

    const { rows: lowStockProducts } = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.total_stock <= p.min_stock
      ORDER BY p.total_stock ASC
      LIMIT 10
    `);

    const { rows: categoryStats } = await pool.query(`
      SELECT c.name, c.color, COUNT(p.id) as count, COALESCE(SUM(p.total_stock), 0) as total_stock
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name, c.color
      ORDER BY total_stock DESC
    `);

    res.json({
      totalProducts: parseInt(pCount[0].count),
      totalStock: parseFloat(sSum[0].total),
      lowStock: parseInt(lCount[0].count),
      totalStands: parseInt(stCount[0].count),
      totalUsers: parseInt(uCount[0].count),
      recentMovements,
      lowStockProducts,
      categoryStats
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/stock/sales-report - Detailed sales report
router.get('/sales-report', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { start_date, end_date, customer_id } = req.query;
    let queryStr = `
      SELECT sm.id, sm.quantity, sm.unit_price, sm.created_at, sm.notes,
             p.name as product_name, p.sku,
             b.batch_number,
             c.name as customer_name, c.document_id,
             (sm.quantity * sm.unit_price) as total_price
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN batches b ON sm.batch_id = b.id
      LEFT JOIN customers c ON sm.customer_id = c.id
      WHERE sm.type = 'salida' AND sm.customer_id IS NOT NULL
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      queryStr += ` AND sm.created_at::date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      queryStr += ` AND sm.created_at::date <= $${params.length}`;
    }
    if (customer_id) {
      params.push(customer_id);
      queryStr += ` AND sm.customer_id = $${params.length}`;
    }

    queryStr += ` ORDER BY sm.created_at DESC`;

    const { rows: sales } = await pool.query(queryStr, params);
    res.json(sales);
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ error: 'Error al obtener reporte de ventas' });
  }
});

module.exports = router;
