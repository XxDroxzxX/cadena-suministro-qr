const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers - List active customers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE active = 1 ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/customers/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1 AND active = 1', [req.params.id]);
    const customer = rows[0];
    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Create new customer (Admin & Vendedor)
router.post('/', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { name, document_id, email, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const { rows } = await pool.query(`
      INSERT INTO customers (name, document_id, email, phone, address, active)
      VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING *
    `, [name, document_id || null, email || null, phone || null, address || null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer (Admin & Vendedor)
router.put('/:id', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { name, document_id, email, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const { rows: checkRows } = await pool.query('SELECT id FROM customers WHERE id = $1 AND active = 1', [req.params.id]);
    if (checkRows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    const { rows } = await pool.query(`
      UPDATE customers 
      SET name = $1, document_id = $2, email = $3, phone = $4, address = $5
      WHERE id = $6
      RETURNING *
    `, [name, document_id || null, email || null, phone || null, address || null, req.params.id]);

    res.json(rows[0]);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Soft Delete (Admin ONLY)
router.delete('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { rows: checkRows } = await pool.query('SELECT id FROM customers WHERE id = $1', [req.params.id]);
    if (checkRows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Soft delete to keep audit info
    await pool.query('UPDATE customers SET active = 0 WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
