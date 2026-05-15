const { createClient } = require('@supabase/supabase-js');

// OLD Project (plin2)
const OLD_URL = 'https://rowqxyqtehwmsbhkbrjj.supabase.co';
const OLD_SERVICE_KEY = process.env.OLD_SERVICE_KEY; // Need Service Role Key for full migration

// NEW Project (plin)
const NEW_URL = 'https://bxjkyhwprxkubmgmsvrf.supabase.co';
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY; // Need Service Role Key for full migration

if (!OLD_SERVICE_KEY || !NEW_SERVICE_KEY) {
  console.error('Error: OLD_SERVICE_KEY and NEW_SERVICE_KEY environment variables are required.');
  console.log('Please run: OLD_SERVICE_KEY=... NEW_SERVICE_KEY=... node scripts/migrate.js');
  process.exit(1);
}

const oldSupabase = createClient(OLD_URL, OLD_SERVICE_KEY);
const newSupabase = createClient(NEW_URL, NEW_SERVICE_KEY);

const TABLES = ['users', 'performances', 'posts', 'chats'];

async function migrate() {
  console.log('🚀 Starting migration...');

  for (const table of TABLES) {
    console.log(`\n📦 Migrating table: ${table}...`);
    
    // 1. Fetch data from old
    const { data: oldData, error: fetchError } = await oldSupabase
      .from(table)
      .select('*');

    if (fetchError) {
      console.error(`❌ Error fetching from ${table}:`, fetchError.message);
      continue;
    }

    console.log(`✅ Fetched ${oldData.length} rows from ${table}.`);

    if (oldData.length === 0) continue;

    // 2. Insert into new
    // We use .upsert() to avoid duplicates if rerun
    const { error: insertError } = await newSupabase
      .from(table)
      .upsert(oldData);

    if (insertError) {
      console.error(`❌ Error inserting into ${table}:`, insertError.message);
    } else {
      console.log(`✅ Successfully migrated ${table}.`);
    }
  }

  console.log('\n✨ Migration complete!');
}

migrate();
