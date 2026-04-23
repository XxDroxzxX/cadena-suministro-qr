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
        stage TEXT DEFAULT 'production' CHECK(stage IN ('raw_material', 'production', 'finished_goods', 'distribution')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration: Add stage to stands if it doesn't exist
      ALTER TABLE stands ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'production' CHECK(stage IN ('raw_material', 'production', 'finished_goods', 'distribution'));

      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        quality_rating INTEGER DEFAULT 5,
        environmental_rating INTEGER DEFAULT 5,
        sustainability_rating INTEGER DEFAULT 0,
        environmental_impact_rating INTEGER DEFAULT 0,
        chemical_free_rating INTEGER DEFAULT 0,
        plant_quality_rating INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Migrations for new supplier ratings
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sustainability_rating INTEGER DEFAULT 0;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS environmental_impact_rating INTEGER DEFAULT 0;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS chemical_free_rating INTEGER DEFAULT 0;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS plant_quality_rating INTEGER DEFAULT 0;

      CREATE TABLE IF NOT EXISTS supplier_orders (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'shipped', 'delivered', 'cancelled')),
        tracking_number TEXT,
        carrier TEXT,
        gps_link TEXT,
        ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expected_at TIMESTAMP,
        delivered_at TIMESTAMP,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'dispatched', 'cancelled')),
        tracking_number TEXT,
        carrier TEXT,
        total_amount DECIMAL(12,2) DEFAULT 0,
        dispatched_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL
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
        order_id INTEGER REFERENCES orders(id),
        supplier_order_id INTEGER REFERENCES supplier_orders(id),
        user_id INTEGER REFERENCES users(id),
        customer_id INTEGER REFERENCES customers(id),
        type TEXT NOT NULL CHECK(type IN ('entrada', 'salida', 'ajuste')),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(12,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration: Ensure cascades exist for product deletion
      -- For order_items
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_product_id_fkey') THEN
          ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
        END IF;
        ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
      EXCEPTION WHEN OTHERS THEN 
        -- If already exists with different name or similar, just log or skip
      END $$;

      -- For stock_movements
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stock_movements_product_id_fkey') THEN
          ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_product_id_fkey;
        END IF;
        ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
      EXCEPTION WHEN OTHERS THEN 
      END $$;

      -- Survey tables
      CREATE TABLE IF NOT EXISTS surveys (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        questions JSONB NOT NULL,
        public_token TEXT UNIQUE NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS survey_responses (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        respondent_name TEXT,
        respondent_email TEXT,
        respondent_phone TEXT,
        answers JSONB NOT NULL,
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
