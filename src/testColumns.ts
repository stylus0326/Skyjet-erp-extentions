import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://orevazfyhtaujfxpvzvx.supabase.co";
const SUPABASE_KEY = "sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("=== THÔNG TIN CÁC BẢNG TRÊN SUPABASE ===");

  const tables = [
    'campaign',
    'campaign_blackout_periods',
    'campaign_details',
    'system_balance_thresholds',
    'airports'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(3);
    if (error) {
      console.log(`❌ Bảng [${table}]: Lỗi - ${error.message}`);
    } else {
      console.log(`✅ Bảng [${table}]: Thành công, có ${data?.length} dòng.`);
      if (data && data.length > 0) {
        console.log(`   Dòng dữ liệu mẫu:`, JSON.stringify(data[0], null, 2));
      } else {
        console.log(`   (Bảng trống)`);
      }
    }
  }
}

run();
