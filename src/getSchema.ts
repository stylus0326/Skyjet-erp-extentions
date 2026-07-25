import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://orevazfyhtaujfxpvzvx.supabase.co";
const SUPABASE_KEY = "sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("=== KIỂM TRA SCHEMA CỦA CÁC BẢNG ===");

  const tables = [
    'campaign',
    'campaign_blackout_periods',
    'campaign_details',
    'system_balance_thresholds',
    'airports'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('non_existent_field_to_trigger_schema_help').limit(1);
    if (error) {
      console.log(`\nBảng [${table}]:`);
      console.log(error.message);
    }
  }
}

run();
