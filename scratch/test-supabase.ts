const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  try {
    console.log('Connecting to Supabase...');
    const url = `${SUPABASE_URL}/rest/v1/vna_ticket_cache?select=*`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Connection Successful! Total cached rows:', data.length);
    if (data.length > 0) {
      console.log('Keys:', Object.keys(data[0]));
      console.log('First cached record:', data[0]);
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}
run();
