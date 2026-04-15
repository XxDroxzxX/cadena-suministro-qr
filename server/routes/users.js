const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - List all users (admin only)
router.get('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, username, full_name, role, active, created_at FROM users ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/users - Create user (admin only)
router.post('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const validRoles = ['admin', 'bodeguero', 'vendedor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const { rows: existingRows } = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role, active, created_at',
      [username, password_hash, full_name, role]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { username, password, full_name, role, active } = req.body;
    const { rows: currentRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = currentRows[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Prevent deactivating yourself
    if (req.user.id === parseInt(req.params.id) && active === 0) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }

    let password_hash = user.password_hash;
    if (password) {
      password_hash = bcrypt.hashSync(password, 10);
    }

    const { rows } = await pool.query(`
      UPDATE users SET username = $1, password_hash = $2, full_name = $3, role = $4, active = $5 WHERE id = $6
      RETURNING id, username, full_name, role, active, created_at
    `, [
      username || user.username,
      password_hash,
      full_name || user.full_name,
      role || user.role,
      active !== undefined ? active : user.active,
      req.params.id
    ]);

    res.json(rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
