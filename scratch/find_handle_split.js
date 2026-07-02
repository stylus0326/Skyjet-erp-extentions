import * as fs from 'fs';
const lines = fs.readFileSync('src/data.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.includes('handleSplitDescription')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
