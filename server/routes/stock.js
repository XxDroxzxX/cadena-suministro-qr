const express = require('express');
const { db } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/stock - Get all movements
router.get('/', authMiddleware, (req, res) => {
  try {
    const { product_id, stand_id, type, date_from, date_to, limit } = req.query;
    let query = `
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

    if (product_id) { query += ` AND sm.product_id = ?`; params.push(product_id); }
    if (stand_id) { query += ` AND sm.stand_id = ?`; params.push(stand_id); }
    if (type) { query += ` AND sm.type = ?`; params.push(type); }
    if (date_from) { query += ` AND sm.created_at >= ?`; params.push(date_from); }
    if (date_to) { query += ` AND sm.created_at <= ?`; params.push(date_to + ' 23:59:59'); }

    query += ` ORDER BY sm.created_at DESC`;
    if (limit) { query += ` LIMIT ?`; params.push(parseInt(limit)); }

    const movements = db.prepare(query).all(...params);
    res.json(movements);
  } catch (err) {
    console.error('Get movements error:', err);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// POST /api/stock/entrada - Add stock (Vendedor + Admin)
router.post('/entrada', authMiddleware, roleGuard('admin', 'vendedor'), (req, res) => {
  try {
    const { product_id, stand_id, quantity, batch_number, notes } = req.body;
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Producto y cantidad válidos son requeridos' });
    }

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

    // Update total stock
    db.prepare('UPDATE products SET total_stock = total_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(quantity, product_id);

    // Update stand quantity if specified
    if (stand_id) {
      const existing = db.prepare('SELECT * FROM product_stands WHERE product_id = ? AND stand_id = ? AND (batch_id = ? OR (batch_id IS NULL AND ? IS NULL))')
        .get(product_id, stand_id, batchId, batchId);
      
      if (existing) {
        db.prepare('UPDATE product_stands SET quantity = quantity + ? WHERE id = ?')
          .run(quantity, existing.id);
      } else {
        db.prepare('INSERT INTO product_stands (product_id, stand_id, batch_id, quantity) VALUES (?, ?, ?, ?)')
          .run(product_id, stand_id, batchId, quantity);
      }
    }

    // Log movement
    db.prepare(`
      INSERT INTO stock_movements (product_id, stand_id, batch_id, user_id, type, quantity, notes)
      VALUES (?, ?, ?, ?, 'entrada', ?, ?)
    `).run(product_id, stand_id || null, batchId, req.user.id, quantity, notes || null);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    res.json({ message: 'Stock agregado correctamente', product: updated });
  } catch (err) {
    console.error('Stock entrada error:', err);
    res.status(500).json({ error: 'Error al agregar stock' });
  }
});

// POST /api/stock/salida - Remove stock (Bodeguero + Admin) - FIFO Implementation
router.post('/salida', authMiddleware, roleGuard('admin', 'bodeguero'), (req, res) => {
  const transaction = db.transaction(() => {
    const { product_id, stand_id, quantity, notes, customer_id } = req.body;
    let remainingToWithdraw = parseInt(quantity);

    if (!product_id || !remainingToWithdraw || remainingToWithdraw <= 0) {
      throw new Error('Producto y cantidad válidos son requeridos');
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) throw new Error('Producto no encontrado');

    if (product.total_stock < remainingToWithdraw) {
      throw new Error('Stock insuficiente en sistema');
    }

    // FIFO Logic: Get oldest batches in this stand (if specified) or across all stands
    let query = `
      SELECT ps.*, b.batch_number, b.created_at as batch_created
      FROM product_stands ps
      LEFT JOIN batches b ON ps.batch_id = b.id
      WHERE ps.product_id = ? AND ps.quantity > 0
    `;
    const params = [product_id];

    if (stand_id) {
      query += ` AND ps.stand_id = ?`;
      params.push(stand_id);
    }

    // Sort by batch creation date (oldest first)
    query += ` ORDER BY b.created_at ASC, ps.id ASC`;

    const availableLotes = db.prepare(query).all(...params);
    const totalAvailable = availableLotes.reduce((sum, item) => sum + item.quantity, 0);

    if (totalAvailable < remainingToWithdraw) {
      throw new Error(stand_id ? 'Stock insuficiente en este stand' : 'Stock insuficiente en bodega');
    }

    // Deduct from batches one by one
    for (const lot of availableLotes) {
      if (remainingToWithdraw <= 0) break;

      const take = Math.min(lot.quantity, remainingToWithdraw);
      
      // Update stand quantity
      db.prepare('UPDATE product_stands SET quantity = quantity - ? WHERE id = ?')
        .run(take, lot.id);

      // Log detailed movement for this batch
      db.prepare(`
        INSERT INTO stock_movements (product_id, stand_id, batch_id, user_id, customer_id, type, quantity, unit_price, notes)
        VALUES (?, ?, ?, ?, ?, 'salida', ?, ?, ?)
      `).run(product_id, lot.stand_id, lot.batch_id, req.user.id, customer_id || null, take, product.unit_price || 0, notes || `Salida FIFO (Lote: ${lot.batch_number || 'S/L'})`);

      remainingToWithdraw -= take;
    }

    // Update total product stock
    db.prepare('UPDATE products SET total_stock = total_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(quantity, product_id);

    return db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  });

  try {
    const updated = transaction();
    res.json({ message: 'Stock retirado correctamente (FIFO)', product: updated });
  } catch (err) {
    console.error('Stock salida error:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/stock/dashboard - Dashboard stats
router.get('/dashboard', authMiddleware, (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalStock = db.prepare('SELECT COALESCE(SUM(total_stock), 0) as total FROM products').get().total;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE total_stock <= min_stock').get().count;
    const totalStands = db.prepare('SELECT COUNT(*) as count FROM stands').get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE active = 1').get().count;

    const recentMovements = db.prepare(`
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
    `).all();

    const lowStockProducts = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.total_stock <= p.min_stock
      ORDER BY p.total_stock ASC
      LIMIT 10
    `).all();

    const categoryStats = db.prepare(`
      SELECT c.name, c.color, COUNT(p.id) as count, COALESCE(SUM(p.total_stock), 0) as total_stock
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY total_stock DESC
    `).all();

    res.json({
      totalProducts,
      totalStock,
      lowStock,
      totalStands,
      totalUsers,
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
router.get('/sales-report', authMiddleware, roleGuard('admin', 'vendedor'), (req, res) => {
  try {
    const { start_date, end_date, customer_id } = req.query;
    let query = `
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
      query += ` AND date(sm.created_at) >= date(?)`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND date(sm.created_at) <= date(?)`;
      params.push(end_date);
    }
    if (customer_id) {
      query += ` AND sm.customer_id = ?`;
      params.push(customer_id);
    }

    query += ` ORDER BY sm.created_at DESC`;

    const sales = db.prepare(query).all(...params);
    res.json(sales);
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ error: 'Error al obtener reporte de ventas' });
  }
});

module.exports = router;
