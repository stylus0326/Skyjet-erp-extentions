import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://orevazfyhtaujfxpvzvx.supabase.co", "sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO");

async function run() {
  const { data: campaigns } = await supabase.from('campaign').select('*').in('id', [10, 17]);
  console.log('Campaign dates:');
  campaigns.forEach(c => {
    console.log(`ID: ${c.id} | Name: ${c.name} | Carrier: ${c.carrier} | Valid From: ${c.valid_from} | Valid To: ${c.valid_to}`);
  });
}
run();
