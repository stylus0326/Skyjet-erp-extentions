const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO'; 

async function run() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?DATECOM=eq.2026-06-01`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('EQUUT5 query status:', res.status);
    if (res.ok) {
      console.log('EQUUT5 records:', await res.json());
    } else {
      console.log('Error:', await res.text());
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
