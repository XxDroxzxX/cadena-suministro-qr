const express = require('express');
const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST /api/categories
router.post('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const { rows: existingRows } = await pool.query('SELECT id FROM categories WHERE name = $1', [name]);
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'La categoría ya existe' });
    }

    const { rows: insertRows } = await pool.query(
      'INSERT INTO categories (name, description, color) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, color || '#93C55D']
    );

    res.status(201).json(insertRows[0]);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    const category = rows[0];
    
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const { rows: updatedRows } = await pool.query(
      'UPDATE categories SET name = $1, description = $2, color = $3 WHERE id = $4 RETURNING *',
      [
        name || category.name,
        description !== undefined ? description : category.description,
        color || category.color,
        req.params.id
      ]
    );

    res.json(updatedRows[0]);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id FROM categories WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

module.exports = router;
