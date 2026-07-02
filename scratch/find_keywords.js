const fs = require('fs');
const content = fs.readFileSync('d:/remix_-skyjet-erp-extension-helper/src/data.ts', 'utf8');
const lines = content.split('\n');

const keywords = ['vna_pnr_cache', 'vna_ticket_cache', 'Thời gian bay', 'Kiểm tra', 'hành trình', 'lấy từ supabase', 'save_ticket_cache', 'check_ticket_cache', 'json_data', 'Thành viên'];

lines.forEach((line, index) => {
  keywords.forEach(kw => {
    if (line.includes(kw)) {
      console.log(`Line ${index + 1} [${kw}]: ${line.trim()}`);
    }
  });
});
