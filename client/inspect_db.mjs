import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://springboot.mwujewuqddkwoppdirbz:Shivam@20030905@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT
      conrelid::regclass AS table_name,
      conname AS constraint_name,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND c.contype = 'f'
      AND conrelid::regclass::text IN ('wishlist', 'orders', 'carts', 'profiles');
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run().catch(console.error);
