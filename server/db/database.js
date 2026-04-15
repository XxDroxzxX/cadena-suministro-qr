const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './server/db/inventory.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin','bodeguero','vendedor')) NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#93C55D',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT UNIQUE NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      unit_price REAL DEFAULT 0,
      image_url TEXT,
      qr_data TEXT,
      total_stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      qr_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_stands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 0,
      UNIQUE(product_id, stand_id, batch_id)
    );
  `);

    // Create customers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        document_id TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create stock movements table
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id),
        stand_id INTEGER REFERENCES stands(id),
        batch_id INTEGER REFERENCES batches(id),
        user_id INTEGER REFERENCES users(id),
        customer_id INTEGER REFERENCES customers(id),
        type TEXT NOT NULL CHECK(type IN ('entrada', 'salida', 'ajuste')),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  // Seed default admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin123!', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)
    `).run('admin', hash, 'Administrador', 'admin');
    console.log('✅ Default admin user created (admin / Admin123!)');
  }

  // Seed default categories
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    const categories = [
      { name: 'Aceites Esenciales', description: 'Aceites naturales concentrados', color: '#93C55D' },
      { name: 'Productos de Limpieza', description: 'Productos para limpieza del hogar e industrial', color: '#3498DB' },
      { name: 'Lubricantes', description: 'Lubricantes industriales y automotrices', color: '#F39C12' },
      { name: 'Detergentes', description: 'Detergentes líquidos y en polvo', color: '#9B59B6' },
      { name: 'Desengrasantes', description: 'Productos desengrasantes especializados', color: '#E74C3C' },
    ];
    const stmt = db.prepare('INSERT INTO categories (name, description, color) VALUES (?, ?, ?)');
    for (const cat of categories) {
      stmt.run(cat.name, cat.description, cat.color);
    }
    console.log('✅ Default categories created');
  }

  console.log('✅ Database initialized successfully');
}

module.exports = { db, initDatabase };
