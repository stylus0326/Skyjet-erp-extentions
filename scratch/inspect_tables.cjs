const fs = require('fs');
const path = require('path');

function cleanHtmlText(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
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

const file1 = path.join(__dirname, 'flightvn_result_page.html');
const file2 = path.join(__dirname, 'flightvn_spa_result.html');

console.log('--- FILE 1: flightvn_result_page.html ---');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  const tables = parseFlightVnHtml(html);
  tables.forEach((t, i) => {
    console.log(`Table ${i}: Header ->`, t[0]);
    if (t.length > 1) {
      console.log(`  Row 1 ->`, t[1]);
    }
  });
}

console.log('--- FILE 2: flightvn_spa_result.html ---');
if (fs.existsSync(file2)) {
  const html = fs.readFileSync(file2, 'utf8');
  const tables = parseFlightVnHtml(html);
  tables.forEach((t, i) => {
    console.log(`Table ${i}: Header ->`, t[0]);
    if (t.length > 1) {
      console.log(`  Row 1 ->`, t[1]);
    }
  });
}
