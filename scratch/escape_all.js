import * as fs from 'fs';

const filePath = 'src/data.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace un-escaped backticks in fullName
const searchStr = 'const fullName = `\\${lastName} \\${firstName}`;';
const replacement = 'const fullName = \\`\\${lastName} \\${firstName}\\`;';

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully escaped fullName backticks!');
} else {
  console.error('Could not find fullName target string.');
}
