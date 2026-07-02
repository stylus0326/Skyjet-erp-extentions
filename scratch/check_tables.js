const fs = require('fs');
const path = require('path');

function cleanHtmlText(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFlightVnHtml(htmlText) {
  const tables = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = tableRegex.exec(htmlText)) !== null) {
    const tableContent = match[1];
    const rows = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(tableContent)) !== null) {
      const rowContent = trMatch[1];
      const cells = [];
      const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(cleanHtmlText(cellMatch[2]));
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    tables.push(rows);
  }
  return tables;
}

const htmlPath = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const tables = parseFlightVnHtml(html);
  tables.forEach((t, idx) => {
    console.log(`Table ${idx}:`);
    t.slice(0, 5).forEach((row, rowIdx) => {
      console.log(`  Row ${rowIdx}:`, row);
    });
  });
} else {
  console.log('File not found:', htmlPath);
}
