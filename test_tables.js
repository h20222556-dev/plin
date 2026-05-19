const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // If rpc doesn't exist, let's query via postgrest details or common tables
    console.log('RPC get_tables error:', error.message);
    const tables = ['users', 'profiles', 'performances', 'posts', 'follows', 'comments'];
    for (const table of tables) {
      const { error: tErr } = await supabase.from(table).select('*').limit(1);
      console.log(`Table '${table}':`, tErr ? tErr.message : 'exists');
    }
  } else {
    console.log('Tables:', data);
  }
}

check();
