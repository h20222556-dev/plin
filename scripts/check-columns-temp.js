const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0ZGtiYXZmYXRkem5ndGVybWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjE4MjEsImV4cCI6MjA5NDMzNzgyMX0.lrbCz-CHLa-vAfM8CbbGygb23kq_qPZvHLobl6OgufU";
const baseUrl = "https://gtdkbavfatdzngtermjf.supabase.co/rest/v1";

async function run() {
  try {
    // Attempt to update a record (or just select with a non-existent column)
    const res = await fetch(`${baseUrl}/performances?select=id,seat&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    });
    const data = await res.json();
    console.log('Result of querying seat:', data);
  } catch (err) {
    console.error('Error running test:', err);
  }
}
run();
