const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  console.log('--- Occurrences of 3741000 in flightvn_result_page.html ---');
  let idx = 0;
  while ((idx = html.indexOf('3741000', idx)) !== -1) {
    console.log(html.substring(Math.max(0, idx - 150), Math.min(html.length, idx + 150)));
    idx += 7;
  }
}

const file2 = path.join(__dirname, 'flightvn_spa_result.html');
if (fs.existsSync(file2)) {
  const html = fs.readFileSync(file2, 'utf8');
  console.log('--- Occurrences of 1430000 in flightvn_spa_result.html ---');
  let idx = 0;
  while ((idx = html.indexOf('1430000', idx)) !== -1) {
    console.log(html.substring(Math.max(0, idx - 150), Math.min(html.length, idx + 150)));
    idx += 7;
  }
}
