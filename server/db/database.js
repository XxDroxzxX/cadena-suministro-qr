const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const query = (text, params) => pool.query(text, params);

async function initDatabase() {
  try {
    const client = await pool.connect();
    
    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','bodeguero','vendedor')),
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#93C55D',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT UNIQUE NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        unit_price DECIMAL(12,2) DEFAULT 0,
        image_url TEXT,
        qr_data TEXT,
        total_stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stands (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        qr_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS batches (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        batch_number TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_stands (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
        batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 0,
        UNIQUE(product_id, stand_id, batch_id)
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        document_id TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        stand_id INTEGER REFERENCES stands(id),
        batch_id INTEGER REFERENCES batches(id),
        user_id INTEGER REFERENCES users(id),
        customer_id INTEGER REFERENCES customers(id),
        type TEXT NOT NULL CHECK(type IN ('entrada', 'salida', 'ajuste')),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(12,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default admin user
    const res = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (res.rows.length === 0) {
      const hash = bcrypt.hashSync('Admin123!', 10);
      await client.query(`
        INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)
      `, ['admin', hash, 'Administrador', 'admin']);
      console.log('✅ Default admin user created (admin / Admin123!)');
    }

    // Seed default categories
    const catCount = await client.query('SELECT COUNT(*) as count FROM categories');
    if (parseInt(catCount.rows[0].count) === 0) {
      const categories = [
        { name: 'Aceites Esenciales', description: 'Aceites naturales concentrados', color: '#93C55D' },
        { name: 'Productos de Limpieza', description: 'Productos para limpieza del hogar e industrial', color: '#3498DB' },
        { name: 'Lubricantes', description: 'Lubricantes industriales y automotrices', color: '#F39C12' },
        { name: 'Detergentes', description: 'Detergentes líquidos y en polvo', color: '#9B59B6' },
        { name: 'Desengrasantes', description: 'Productos desengrasantes especializados', color: '#E74C3C' },
      ];
      for (const cat of categories) {
        await client.query('INSERT INTO categories (name, description, color) VALUES ($1, $2, $3)', [cat.name, cat.description, cat.color]);
      }
      console.log('✅ Default categories created');
    }

    client.release();
    console.log('✅ Database (PostgreSQL) initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    throw err;
  }
}

module.exports = { pool, query, initDatabase };
