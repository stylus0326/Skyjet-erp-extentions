import * as fs from 'fs';
const content = fs.readFileSync('src/data.ts', 'utf8');
console.log('Includes GHA:', content.includes('GHA'));
console.log('Includes GSG:', content.includes('GSG'));
console.log('Includes CXR:', content.includes('CXR'));

// Look for airport mappings or itinerary parsing
const matches = content.match(/function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{[^}]*GHA[^}]*\}/g);
if (matches) {
  console.log('Matches:', matches);
} else {
  console.log('No GHA functions found');
}
