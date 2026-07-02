const fs = require('fs');
const path = require('path');

function getSevenDigitNumbers(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf8');
  const matches = html.match(/\b\d{7}\b/g) || [];
  console.log(filename, '7-digit numbers:', Array.from(new Set(matches)));
}

getSevenDigitNumbers('flightvn_result_page.html');
getSevenDigitNumbers('flightvn_spa_result.html');
