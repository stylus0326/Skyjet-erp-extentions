import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://orevazfyhtaujfxpvzvx.supabase.co", "sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO");

async function run() {
  const { data: policies } = await supabase.from('policies').select('*');
  const { data: thresholds } = await supabase.from('thresholds').select('*');
  const { data: campaigns } = await supabase.from('campaign').select('*');
  console.log('--- POLICIES ---');
  console.log(JSON.stringify(policies, null, 2));
  console.log('--- THRESHOLDS ---');
  console.log(JSON.stringify(thresholds, null, 2));
  console.log('--- CAMPAIGNS ---');
  console.log(JSON.stringify(campaigns.map(c => ({ id: c.id, name: c.name })), null, 2));
}
run();
