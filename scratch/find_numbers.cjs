const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  // Find all numbers of length >= 5
  const matches = html.match(/\b\d{5,10}\b/g) || [];
  console.log('--- Numbers in flightvn_result_page.html ---');
  console.log([...new Set(matches)]);
}

const file2 = path.join(__dirname, 'flightvn_spa_result.html');
if (fs.existsSync(file2)) {
  const html = fs.readFileSync(file2, 'utf8');
  const matches = html.match(/\b\d{5,10}\b/g) || [];
  console.log('--- Numbers in flightvn_spa_result.html ---');
  console.log([...new Set(matches)]);
}
