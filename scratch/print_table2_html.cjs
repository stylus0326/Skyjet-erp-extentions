const fs = require('fs');
const path = require('path');

function printTable2(filePath) {
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf8');
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  let i = 0;
  while ((match = tableRegex.exec(html)) !== null) {
    if (i === 2) {
      console.log(`=== ${path.basename(filePath)} Table 2 ===`);
      console.log(match[1]);
    }
    i++;
  }
}

printTable2(path.join(__dirname, 'flightvn_result_page.html'));
printTable2(path.join(__dirname, 'flightvn_spa_result.html'));
