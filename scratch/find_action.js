const fs = require('fs');
const path = require('path');

const dataTsPath = path.join(__dirname, '..', 'src', 'data.ts');
const content = fs.readFileSync(dataTsPath, 'utf8');

// Find all occurrences of fetch_vietnamairlines or VN API references
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('fetch_vietnamairlines') || line.includes('fetch_vietnam') || line.includes('vietnamairlines.com')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
