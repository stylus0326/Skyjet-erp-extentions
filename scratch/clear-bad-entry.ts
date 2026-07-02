const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  try {
    const ticketNumber = '7382321861921';
    console.log(`Querying vna_ticket_cache for ticket ${ticketNumber}...`);
    let res = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?ticket_number=eq.${ticketNumber}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    let data = await res.json();
    console.log('Current rows matching ticket:', data);

    if (data.length > 0) {
      console.log(`Updating ticket ${ticketNumber} fare to 3353704...`);
      res = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?ticket_number=eq.${ticketNumber}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          fare: 3353704
        })
      });
      const updateData = await res.json();
      console.log('Update result:', updateData);
    }
  } catch (err) {
    console.error('Failed:', err);
  }
}
run();
