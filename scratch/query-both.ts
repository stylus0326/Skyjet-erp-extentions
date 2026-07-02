const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  try {
    const pnrs = ['D6V64X', 'DDSP2X'];
    for (const p of pnrs) {
      let res = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?pnr_code=eq.${p}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      let data = await res.json();
      console.log(`PNR ${p}:`, data);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
