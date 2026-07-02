const fs = require('fs');
const path = require('path');

const contentJsPath = path.resolve('scratch', 'extracted', 'content.js');
const content = fs.readFileSync(contentJsPath, 'utf8');

const regex = /(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
let match;
const functions = [];

while ((match = regex.exec(content)) !== null) {
  const funcName = match[0];
  const nameOnly = match[1];
  const index = match.index;
  const lineNo = content.substring(0, index).split('\n').length;
  functions.push({ line: lineNo, name: nameOnly, full: funcName });
}

console.log('--- Functions in content.js ---');
functions.forEach(f => {
  console.log(`Line ${String(f.line).padStart(4, ' ')}: ${f.full}`);
});
