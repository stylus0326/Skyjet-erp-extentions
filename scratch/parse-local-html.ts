import * as fs from 'fs';
import * as path from 'path';

function cleanHtmlText(text: string) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFlightVnHtml(htmlText: string) {
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

const htmlPath = path.resolve('scratch', 'flightvn_result_page.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const tables = parseFlightVnHtml(html);
  console.log(`Found ${tables.length} tables`);
  tables.forEach((t, i) => {
    console.log(`Table ${i}: Header row:`, t[0]);
    console.log(`Table ${i} row count:`, t.length);
    if (t.length > 1) {
      console.log(`Table ${i} row 1:`, t[1]);
    }
  });
} else {
  console.log('File scratch/flightvn_result_page.html does not exist.');
}
