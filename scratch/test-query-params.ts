const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function run() {
  // Test special characters
  const tickets = ["8092451264524", "123-456 ( đoàn)", "VJ123,456", "VJ123/456"];
  const pnrs = ["DNYINQ", "ABC DEF"];

  const encodedTickets = tickets.map(n => '%22' + encodeURIComponent(n) + '%22').join(',');
  const encodedPnrs = pnrs.map(p => '%22' + encodeURIComponent(p) + '%22').join(',');
  const queryParams = `or=(ticket_number.in.(${encodedTickets}),pnr_code.in.(${encodedPnrs}))`;

  try {
    const url = `${SUPABASE_URL}/rest/v1/vna_ticket_cache?${queryParams}&select=*`;
    console.log('Fetching with encodeURIComponent:', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('Status with encodeURIComponent:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }

  // Now test WITHOUT encodeURIComponent (original code style)
  const origTickets = tickets.map(n => '%22' + n + '%22').join(',');
  const origPnrs = pnrs.map(p => '%22' + p + '%22').join(',');
  const origQueryParams = `or=(ticket_number.in.(${origTickets}),pnr_code.in.(${origPnrs}))`;

  try {
    const url = `${SUPABASE_URL}/rest/v1/vna_ticket_cache?${origQueryParams}&select=*`;
    console.log('Fetching without encoding (original):', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('Status without encoding:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
