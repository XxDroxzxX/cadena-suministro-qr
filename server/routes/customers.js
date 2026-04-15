const express = require('express');
const { db } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers - List active customers
router.get('/', authMiddleware, (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM customers WHERE active = 1 ORDER BY name ASC').all();
    res.json(customers);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/customers/:id
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND active = 1').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Create new customer (Admin & Vendedor)
router.post('/', authMiddleware, roleGuard('admin', 'vendedor'), (req, res) => {
  try {
    const { name, document_id, email, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = db.prepare(`
      INSERT INTO customers (name, document_id, email, phone, address, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(name, document_id || null, email || null, phone || null, address || null);

    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer (Admin & Vendedor)
router.put('/:id', authMiddleware, roleGuard('admin', 'vendedor'), (req, res) => {
  try {
    const { name, document_id, email, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const check = db.prepare('SELECT id FROM customers WHERE id = ? AND active = 1').get(req.params.id);
    if (!check) return res.status(404).json({ error: 'Cliente no encontrado' });

    db.prepare(`
      UPDATE customers 
      SET name = ?, document_id = ?, email = ?, phone = ?, address = ?
      WHERE id = ?
    `).run(name, document_id || null, email || null, phone || null, address || null, req.params.id);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Soft Delete (Admin ONLY)
router.delete('/:id', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const check = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id);
    if (!check) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Soft delete to keep audit info
    db.prepare('UPDATE customers SET active = 0 WHERE id = ?').run(req.params.id);
    
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
