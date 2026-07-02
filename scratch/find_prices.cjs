const fs = require('fs');
const path = require('path');

function inspectHtml(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filename);
    return;
  }
  console.log('=== Inspecting', filename, '===');
  const html = fs.readFileSync(filePath, 'utf8');
  
  // Find all numbers of length 5 or more (e.g. 10000 to 99999999)
  const regex = /\b\d{5,10}\b/g;
  let match;
  const matches = new Set();
  while ((match = regex.exec(html)) !== null) {
    matches.add(match[0]);
  }
  
  // For each unique number, find its context (lines around it)
  for (const num of matches) {
    const numRegex = new RegExp(`(^|\\r?\\n)(.*${num}.*)`, 'g');
    let m;
    let count = 0;
    while ((m = numRegex.exec(html)) !== null && count < 3) {
      console.log(`Number ${num}: ${m[2].trim().substring(0, 150)}`);
      count++;
    }
  }
}

inspectHtml('flightvn_result_page.html');
inspectHtml('flightvn_spa_result.html');
