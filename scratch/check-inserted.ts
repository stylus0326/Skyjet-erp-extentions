import { createClient } from '@supabase/supabase-api';
const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('campaign_details')
    .select('*')
    .eq('campaign_id', 17);
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
