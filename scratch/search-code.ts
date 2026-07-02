import * as fs from 'fs';

const content = fs.readFileSync('src/data.ts', 'utf8');
const lines = content.split('\n');
const queries = ['airlineId ='];

queries.forEach(query => {
  console.log(`=== Matches for: ${query} ===`);
  lines.forEach((line, index) => {
    if (line.includes(query)) {
      console.log(`  Line ${index + 1}: ${line.trim().substring(0, 120)}`);
    }
  });
});

