const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  const pnr = 'EF45DY';
  console.log(`\n--- Querying PNR: ${pnr} ---`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?pnr_code=eq.${pnr}&select=*`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const data = await res.json();
  console.log('Results:', JSON.stringify(data, null, 2));
}
run();
