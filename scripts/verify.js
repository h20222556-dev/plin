const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://bxjkyhwprxkubmgmsvrf.supabase.co';
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4amt5aHdwcnhrdWJtZ21zdnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2Njg0NzUsImV4cCI6MjA5NDI0NDQ3NX0.CQO8QRl7lBrV46qfWCcoyw3xWMiza5PHevFqf7oNv14';

const supabase = createClient(NEW_URL, NEW_ANON_KEY);

async function verify() {
  console.log('🔍 Verifying connection to new Supabase project...');
  
  try {
    const { data, error } = await supabase
      .from('performances')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;
    
    console.log('✅ Connection successful!');
    console.log(`📊 Total performances in new DB: ${data || 0}`);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
  }
}

verify();
