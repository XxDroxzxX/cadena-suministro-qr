const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './server/db/inventory.db');
const db = new Database(dbPath);

try {
    // 1. Create batches table
    db.exec(`
        CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            batch_number TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Update product_stands
    // SQLite doesn't support sophisticated ALTER TABLE with RENAME and unique constraints easily
    // So we recreate the table
    db.exec(`
        CREATE TABLE product_stands_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
            batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
            quantity INTEGER DEFAULT 0,
            UNIQUE(product_id, stand_id, batch_id)
        )
    `);

    // Migrate old data if any (batch_id will be NULL for old rows)
    try {
        db.exec(`INSERT INTO product_stands_new (id, product_id, stand_id, quantity) SELECT id, product_id, stand_id, quantity FROM product_stands`);
    } catch(e) { console.log('No old data to migrate in product_stands'); }

    db.exec(`DROP TABLE product_stands`);
    db.exec(`ALTER TABLE product_stands_new RENAME TO product_stands`);

    // 3. Update stock_movements
    db.exec(`ALTER TABLE stock_movements ADD COLUMN batch_id INTEGER REFERENCES batches(id)`);

    console.log('✅ Migration successful');
} catch (err) {
    console.error('❌ Migration failed:', err);
} finally {
    db.close();
}
