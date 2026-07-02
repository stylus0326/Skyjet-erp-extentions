const fs = require('fs');
const path = require('path');

const dataTsPath = path.join(__dirname, '..', 'src', 'data.ts');
const content = fs.readFileSync(dataTsPath, 'utf8');

const lines = content.split('\n');
let bgStartIndex = -1;
let bgEndIndex = -1;

lines.forEach((line, index) => {
  if (line.includes("name: 'background.js'") || line.includes('path: \'background.js\'')) {
    bgStartIndex = index;
  }
  // The background.js content is finished when the next file object starts, which has name: 'content.js'
  if (bgStartIndex !== -1 && bgEndIndex === -1 && (line.includes("name: 'content.js'") || line.includes("path: 'content.js'"))) {
    bgEndIndex = index;
  }
});

console.log(`background.js starts at line ${bgStartIndex + 1} and ends at line ${bgEndIndex + 1}`);
