const express = require('express');
const { db } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories
router.get('/', authMiddleware, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST /api/categories
router.post('/', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ error: 'La categoría ya existe' });
    }

    const result = db.prepare('INSERT INTO categories (name, description, color) VALUES (?, ?, ?)').run(
      name, description || null, color || '#93C55D'
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const { name, description, color } = req.body;
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    db.prepare('UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?').run(
      name || category.name,
      description !== undefined ? description : category.description,
      color || category.color,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

module.exports = router;
