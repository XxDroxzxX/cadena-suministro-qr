const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - List all users (admin only)
router.get('/', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, full_name, role, active, created_at FROM users ORDER BY created_at DESC
    `).all();
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/users - Create user (admin only)
router.post('/', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const validRoles = ['admin', 'bodeguero', 'vendedor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, password_hash, full_name, role);

    const user = db.prepare('SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const { username, password, full_name, role, active } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
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

    db.prepare(`
      UPDATE users SET username = ?, password_hash = ?, full_name = ?, role = ?, active = ? WHERE id = ?
    `).run(
      username || user.username,
      password_hash,
      full_name || user.full_name,
      role || user.role,
      active !== undefined ? active : user.active,
      req.params.id
    );

    const updated = db.prepare('SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?')
      .get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
