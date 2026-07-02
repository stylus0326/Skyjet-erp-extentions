const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  try {
    console.log(`Querying all vna_ticket_cache rows`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed:', err);
  }
}
run();
