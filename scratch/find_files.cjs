const fs = require('fs');
const content = fs.readFileSync('src/data.ts', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('fetch_vietnamairlines')) {
    console.log(`Line ${idx + 1}: ${l}`);
  }
});
