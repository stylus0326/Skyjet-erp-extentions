const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function check() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/vna_ticket_cache?pnr_code=eq.NYC75Z&select=*`;
    console.log('Querying URL:', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log('Query Result:', JSON.stringify(data, null, 2));
    } else {
      console.error('Fetch failed:', res.status, res.statusText, await res.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

check();
