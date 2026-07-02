import * as fs from 'fs';
const lines = fs.readFileSync('src/data.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.includes('json_data')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
