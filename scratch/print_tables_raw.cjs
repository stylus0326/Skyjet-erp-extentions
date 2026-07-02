const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  let i = 0;
  while ((match = tableRegex.exec(html)) !== null) {
    console.log(`--- TABLE ${i} RAW HEAD ---`);
    const content = match[1];
    const trMatch = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (trMatch) {
      console.log(trMatch[1].trim());
    }
    i++;
  }
}
