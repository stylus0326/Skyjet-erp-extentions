import * as fs from 'fs';
import * as path from 'path';

const content = fs.readFileSync('src/data.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('titleMatch')) {
    console.log(`Line ${index + 1}: ${line}`);
    // Print 5 lines before and after
    for (let i = Math.max(0, index - 5); i <= Math.min(lines.length - 1, index + 5); i++) {
      console.log(`  ${i + 1}: ${lines[i]}`);
    }
  }
});
