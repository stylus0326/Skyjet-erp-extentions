import { createClient as createSupabaseClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('campaign_details')
    .select('id, campaign_id, groups_tag, booking_class, amount')
    .eq('campaign_id', 10);
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
