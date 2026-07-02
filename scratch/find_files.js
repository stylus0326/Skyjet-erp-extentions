const fs = require('fs');
const content = fs.readFileSync('src/data.ts', 'utf8');
const lines = content.split('\n');

const files = [
  { name: 'manifest.json', pattern: /name:\s*['"]manifest\.json['"]/ },
  { name: 'content.js', pattern: /name:\s*['"]content\.js['"]/ },
  { name: 'background.js', pattern: /name:\s*['"]background\.js['"]/ }
];

files.forEach(f => {
  const index = lines.findIndex(l => f.pattern.test(l));
  console.log(`${f.name} starts at line: ${index + 1}`);
});
