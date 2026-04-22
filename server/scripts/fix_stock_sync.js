const { pool } = require('../db/database');

async function syncStock() {
  console.log('--- INICIANDO AUDITORÍA DE STOCK ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get all products
    const { rows: products } = await client.query('SELECT id, name, total_stock FROM products');
    
    let fixedCount = 0;
    
    for (const product of products) {
      // Sum all quantities in stands for this product
      const { rows: sumRows } = await client.query(
        'SELECT COALESCE(SUM(quantity), 0) as actual_sum FROM product_stands WHERE product_id = $1',
        [product.id]
      );
      
      const actualSum = parseInt(sumRows[0].actual_sum);
      
      if (actualSum !== parseInt(product.total_stock)) {
        console.log(`[INCONSISTENCIA] Producto: ${product.name} (ID: ${product.id})`);
        console.log(`   - En DB (total_stock): ${product.total_stock}`);
        console.log(`   - Suma Real (estantes): ${actualSum}`);
        
        await client.query(
          'UPDATE products SET total_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [actualSum, product.id]
        );
        
        console.log(`   -> CORREGIDO a ${actualSum}`);
        fixedCount++;
      }
    }
    
    await client.query('COMMIT');
    console.log(`--- AUDITORÍA FINALIZADA ---`);
    console.log(`Total productos revisados: ${products.length}`);
    console.log(`Total productos corregidos: ${fixedCount}`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la sincronización:', err);
  } finally {
    client.release();
    process.exit();
  }
}

syncStock();
