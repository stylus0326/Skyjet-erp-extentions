const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vna_pnr_cache?select=*`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const data = await res.json();
  if (data.length > 0) {
    console.log('typeof json_data:', typeof data[0].json_data);
    console.log('json_data is object:', typeof data[0].json_data === 'object');
    console.log('json_data is string:', typeof data[0].json_data === 'string');
    console.log('value:', data[0].json_data);
  }
}
run();
