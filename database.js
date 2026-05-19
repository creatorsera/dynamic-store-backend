const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_ref   TEXT PRIMARY KEY,
        name        TEXT, phone TEXT, address TEXT,
        city        TEXT, payment TEXT, notes TEXT,
        total       INTEGER, status TEXT DEFAULT 'pending',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id           SERIAL PRIMARY KEY,
        order_ref    TEXT REFERENCES orders(order_ref),
        product_id   INTEGER, product_name TEXT,
        price        INTEGER, quantity INTEGER,
        color        TEXT DEFAULT '',
        size         TEXT DEFAULT ''
      );
    `);
    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '';`);
    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size  TEXT DEFAULT '';`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id           SERIAL PRIMARY KEY,
        name         TEXT    NOT NULL,
        base_price   INTEGER NOT NULL DEFAULT 0,
        category     TEXT    NOT NULL DEFAULT 'General',
        badge        TEXT    DEFAULT NULL,
        piece_type   TEXT    DEFAULT '1-piece',
        pieces       JSONB   DEFAULT '[]',
        variants     JSONB   DEFAULT '[]',
        sizes        JSONB   DEFAULT '[]',
        low_stock    BOOLEAN DEFAULT FALSE,
        active       BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price  INTEGER NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS piece_type  TEXT    DEFAULT '1-piece';`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS pieces      JSONB   DEFAULT '[]';`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS variants    JSONB   DEFAULT '[]';`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes       JSONB   DEFAULT '[]';`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock   BOOLEAN DEFAULT FALSE;`);
    console.log('✓ Database migration complete');
  } catch (err) {
    console.error('✗ Migration error:', err.message);
  } finally {
    client.release();
  }
}

migrate();

async function saveOrderTx(orderData, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO orders (order_ref,name,phone,address,city,payment,notes,total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [orderData.order_ref, orderData.name, orderData.phone, orderData.address,
       orderData.city, orderData.payment, orderData.notes, orderData.total]
    );
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_ref,product_id,product_name,price,quantity,color,size)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [orderData.order_ref, item.product_id, item.product_name,
         item.price, item.quantity, item.color||'', item.size||'']
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const getOrder      = { get: async(ref) => (await pool.query('SELECT * FROM orders WHERE order_ref=$1',[ref])).rows[0]||null };
const getOrderItems = { all: async(ref) => (await pool.query('SELECT * FROM order_items WHERE order_ref=$1',[ref])).rows };
const getAllOrders   = { all: async() => (await pool.query(`SELECT o.*,COUNT(i.id) as item_count FROM orders o LEFT JOIN order_items i ON o.order_ref=i.order_ref GROUP BY o.order_ref ORDER BY o.created_at DESC`)).rows };
const updateStatus  = { run: async(status,ref) => pool.query('UPDATE orders SET status=$1 WHERE order_ref=$2',[status,ref]) };

module.exports = { pool, saveOrderTx, getOrder, getOrderItems, getAllOrders, updateStatus };
