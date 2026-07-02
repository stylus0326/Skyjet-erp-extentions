const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  try {
    console.log('Querying vna_ticket_cache...');
    let res = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    let data = await res.json();
    console.log('Total vna_ticket_cache rows:', data.length);
    if (data.length > 0) {
      console.log('Sample ticket cache:', data.slice(0, 3));
    }

    console.log('\nQuerying vna_pnr_cache...');
    res = await fetch(`${SUPABASE_URL}/rest/v1/vna_pnr_cache?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    data = await res.json();
    console.log('Total vna_pnr_cache rows:', data.length);
    if (data.length > 0) {
      console.log('Sample pnr cache PNR codes:', data.map(r => r.pnr_code));
      console.log('Sample PNR json_data for first:', JSON.stringify(data[0].json_data).substring(0, 500));
    }
  } catch (err) {
    console.error('Failed:', err);
  }
}
run();
