import fs from 'fs';
import path from 'path';

const serverJsPath = 'C:\\Program Files\\1DevTool\\resources\\app.asar.unpacked\\dist\\main\\main\\mcp-servers\\server.js';

if (!fs.existsSync(serverJsPath)) {
  console.error('server.js not found at:', serverJsPath);
  process.exit(1);
}

const content = fs.readFileSync(serverJsPath, 'utf8');

// Look for patterns like name: "...", name:'...' or name: `...` inside tool definitions
const matches = content.matchAll(/name\s*:\s*["'`]([a-zA-Z0-9_-]+)["'`]/g);
const names = new Set();
for (const match of matches) {
  names.add(match[1]);
}

console.log('Found tool names:');
console.log(Array.from(names).sort());
