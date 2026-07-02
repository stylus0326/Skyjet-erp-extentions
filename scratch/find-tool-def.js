import fs from 'fs';

const serverJsPath = 'C:\\Program Files\\1DevTool\\resources\\app.asar.unpacked\\dist\\main\\main\\mcp-servers\\server.js';
const content = fs.readFileSync(serverJsPath, 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('name:') && lines[i].includes('1devtool')) {
    console.log(`Found name: 1devtool at line ${i + 1}`);
    console.log(lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 30)).join('\n'));
    console.log('---');
  }
}
