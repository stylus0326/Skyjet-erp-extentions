import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://orevazfyhtaujfxpvzvx.supabase.co";
const SUPABASE_KEY = "sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: policies } = await supabase.from('policies').select('*');
  const { data: thresholds } = await supabase.from('thresholds').select('*');
  const { data: campaigns } = await supabase.from('campaign').select('*');
  const { data: details } = await supabase.from('campaign_details').select('*');

  console.log("=== QH Campaigns ===");
  const qhCamps = campaigns.filter(c => c.carrier === 'QH');
  for (const c of qhCamps) {
    const cd = details.filter(d => d.campaign_id === c.id);
    const th = thresholds.find(t => t.campaign_id === c.id);
    console.log(`Campaign [${c.id}]: "${c.name}" - valid from ${c.valid_from} to ${c.valid_to}, channel: ${c.channel}`);
    console.log(`  Threshold ID: ${th ? th.id : 'N/A'}`);
    console.log(`  Details:`, JSON.stringify(cd, null, 2));
  }

  console.log("\n=== Policy Threshold Mapping ===");
  for (const p of policies) {
    console.log(`Policy [${p.id}]: "${p.name}" (Agents: ${JSON.stringify(p.agents)})`);
    console.log(`  Includes thresholds: ${JSON.stringify(p.thresholds)}`);
    for (const tid of p.thresholds) {
      const th = thresholds.find(t => t.id === parseInt(tid));
      if (th) {
        const c = campaigns.find(cam => cam.id === th.campaign_id);
        console.log(`    -> Threshold ${th.id}: Campaign [${th.campaign_id}] "${c ? c.name : 'Unknown'}"`);
      }
    }
  }
}

main();
