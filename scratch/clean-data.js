import * as fs from 'fs';

const filePath = 'src/data.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\r\n');
const isLf = lines.length === 1;
const splitLines = isLf ? content.split('\n') : lines;

// We want to delete 1-based lines 4543 to 4632 (inclusive).
// In 0-based index, this is index 4542 to 4631.
const startIdx = 4542;
const endIdx = 4631;

console.log('Line 4543 (0-based 4542):', splitLines[startIdx]);
console.log('Line 4632 (0-based 4631):', splitLines[endIdx]);

if (splitLines[startIdx].includes("},              'VN': 'VNA'") && splitLines[endIdx].includes("});`")) {
  console.log('Removing lines...');
  splitLines.splice(startIdx, endIdx - startIdx + 1);
  fs.writeFileSync(filePath, splitLines.join(isLf ? '\n' : '\r\n'), 'utf8');
  console.log('Done!');
} else {
  console.error('Line checks failed. Not modifying file.');
}
