const express = require('express');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const { db } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// GET /api/products - List all products
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, category_id, low_stock } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color,
             u.full_name as created_by_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(category_id);
    }
    if (low_stock === 'true') {
      query += ` AND p.total_stock <= p.min_stock`;
    }

    query += ` ORDER BY p.updated_at DESC`;

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/:id
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.color as category_color,
             u.full_name as created_by_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Get stands info
    const stands = db.prepare(`
      SELECT ps.*, s.code, s.name as stand_name, s.location, b.batch_number
      FROM product_stands ps
      JOIN stands s ON ps.stand_id = s.id
      LEFT JOIN batches b ON ps.batch_id = b.id
      WHERE ps.product_id = ?
    `).all(req.params.id);

    res.json({ ...product, stands });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/products - Create product
router.post('/', authMiddleware, roleGuard('admin', 'vendedor'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, sku, category_id, unit_price, min_stock, total_stock } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Nombre y SKU son requeridos' });
    }

    // Check SKU uniqueness
    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existing) {
      return res.status(400).json({ error: 'El SKU ya existe' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Generate QR code
    const qrContent = JSON.stringify({ type: 'product', sku, name, id: null });
    const qr_data = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: { dark: '#1A1F2E', light: '#FFFFFF' }
    });

    const result = db.prepare(`
      INSERT INTO products (name, description, sku, category_id, unit_price, image_url, qr_data, total_stock, min_stock, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      description || null,
      sku,
      category_id || null,
      unit_price || 0,
      image_url,
      qr_data,
      total_stock || 0,
      min_stock || 5,
      req.user.id
    );

    // Update QR with actual ID
    const qrContentFinal = JSON.stringify({ type: 'product', sku, name, id: result.lastInsertRowid });
    const qr_data_final = await QRCode.toDataURL(qrContentFinal, {
      width: 300,
      margin: 2,
      color: { dark: '#1A1F2E', light: '#FFFFFF' }
    });
    db.prepare('UPDATE products SET qr_data = ? WHERE id = ?').run(qr_data_final, result.lastInsertRowid);

    // Log stock movement if initial stock
    if (total_stock && parseInt(total_stock) > 0) {
      db.prepare(`
        INSERT INTO stock_movements (product_id, user_id, type, quantity, notes)
        VALUES (?, ?, 'entrada', ?, 'Stock inicial')
      `).run(result.lastInsertRowid, req.user.id, parseInt(total_stock));
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authMiddleware, roleGuard('admin', 'vendedor'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, sku, category_id, unit_price, min_stock } = req.body;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Check SKU uniqueness if changed
    if (sku && sku !== product.sku) {
      const existing = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku, req.params.id);
      if (existing) {
        return res.status(400).json({ error: 'El SKU ya existe' });
      }
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : product.image_url;

    // Regenerate QR if name or SKU changed
    let qr_data = product.qr_data;
    if ((name && name !== product.name) || (sku && sku !== product.sku)) {
      const qrContent = JSON.stringify({ type: 'product', sku: sku || product.sku, name: name || product.name, id: product.id });
      qr_data = await QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 2,
        color: { dark: '#1A1F2E', light: '#FFFFFF' }
      });
    }

    db.prepare(`
      UPDATE products SET
        name = ?, description = ?, sku = ?, category_id = ?,
        unit_price = ?, image_url = ?, qr_data = ?, min_stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || product.name,
      description !== undefined ? description : product.description,
      sku || product.sku,
      category_id || product.category_id,
      unit_price !== undefined ? unit_price : product.unit_price,
      image_url,
      qr_data,
      min_stock !== undefined ? min_stock : product.min_stock,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, roleGuard('admin', 'vendedor'), (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;
