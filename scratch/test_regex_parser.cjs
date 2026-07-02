const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'flightvn_result_page.html'), 'utf8');

function cleanHtmlText(text) {
  return text
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFlightVnHtml(html) {
  // Regex to find tables
  const tables = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = tableRegex.exec(html)) !== null) {
    const tableContent = match[1];
    
    // Parse rows
    const rows = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(tableContent)) !== null) {
      const rowContent = trMatch[1];
      const cells = [];
      
      // Parse th or td
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

const parsed = parseFlightVnHtml(html);
console.log('Total parsed tables:', parsed.length);
parsed.forEach((table, i) => {
  console.log(`Table ${i} has ${table.length} rows`);
  console.log('Header:', table[0]);
  console.log('Row 1:', table[1]);
});
