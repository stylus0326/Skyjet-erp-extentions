import * as fs from 'fs';
const content = fs.readFileSync('src/data.ts', 'utf8');

// Let's search for "itinerary" or "replace" in relation to itinerary/hanh trinh
const regex = /itinerary|hanhTrinh/gi;
let match;
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (regex.test(line)) {
    console.log(`${idx + 1}: ${line}`);
  }
});
