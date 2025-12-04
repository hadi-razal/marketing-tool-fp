const { createBrowserClient } = require('@supabase/auth-helpers-nextjs');
console.log('createBrowserClient length:', createBrowserClient.length);
try {
  const client = createBrowserClient();
  console.log('Called without args successfully');
} catch (e) {
  console.log('Error calling without args:', e.message);
}
