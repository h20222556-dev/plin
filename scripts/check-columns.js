const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtdkbavfatdzngtermjf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0ZGtiYXZmYXRkem5ndGVybWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjE4MjEsImV4cCI6MjA5NDMzNzgyMX0.lrbCz-CHLa-vAfM8CbbGygb23kq_qPZvHLobl6OgufU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('performances')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching performances:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Columns in performances:', Object.keys(data[0]));
      console.log('Sample record:', data[0]);
    } else {
      console.log('No records found in performances, but query succeeded.');
    }
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

run();
