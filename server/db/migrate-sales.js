const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './server/db/inventory.db');
const db = new Database(dbPath);

console.log("=== INICIANDO MIGRACIÓN DE CLIENTES Y VENTAS ===");

try {
    // 1. Create customers table
    console.log("-> Creando tabla 'customers'...");
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

    // 2. Add customer_id and unit_price to stock_movements
    console.log("-> Actualizando tabla 'stock_movements'...");
    try {
        db.exec(`ALTER TABLE stock_movements ADD COLUMN customer_id INTEGER REFERENCES customers(id) DEFAULT NULL`);
        console.log("  Columna 'customer_id' añadida.");
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log("  Columna 'customer_id' ya existe, saltando...");
        } else {
            throw e;
        }
    }

    try {
        db.exec(`ALTER TABLE stock_movements ADD COLUMN unit_price DECIMAL(10,2) DEFAULT NULL`);
        console.log("  Columna 'unit_price' añadida.");
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log("  Columna 'unit_price' ya existe, saltando...");
        } else {
            throw e;
        }
    }

    console.log("✅ Migración completada con éxito.");

} catch (err) {
    console.error("❌ Error durante la migración:", err);
} finally {
    db.close();
}
