import * as fs from 'fs';

const content = fs.readFileSync('scratch/extracted/background.js', 'utf8');
const lines = content.split('\n');

const functionRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
let match;

console.log('--- Functions in background.js ---');
while ((match = functionRegex.exec(content)) !== null) {
  const funcName = match[1];
  const params = match[2];
  const index = match.index;
  const lineNo = content.substring(0, index).split('\n').length;
  console.log(`Line ${lineNo}: function ${funcName}(${params})`);
}
