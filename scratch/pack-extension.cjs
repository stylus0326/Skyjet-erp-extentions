const fs = require('fs');
const path = require('path');

const contentJsPath = 'd:/remix_-skyjet-erp-extension-helper/scratch/extracted/content.js';
const dataTsPath = 'd:/remix_-skyjet-erp-extension-helper/src/data.ts';

const newContent = fs.readFileSync(contentJsPath, 'utf8');
let dataTs = fs.readFileSync(dataTsPath, 'utf8');

const startIndex = dataTs.indexOf("name: 'content.js',");
if (startIndex === -1) {
  console.error("Could not find content.js placeholder in src/data.ts");
  process.exit(1);
}

const contentStartMarker = "content: `";
const contentStartIdx = dataTs.indexOf(contentStartMarker, startIndex);
if (contentStartIdx === -1) {
  console.error("Could not find content start marker in src/data.ts");
  process.exit(1);
}

const nextFileIndex = dataTs.indexOf("name: 'background.js',");
if (nextFileIndex === -1) {
  console.error("Could not find background.js placeholder in src/data.ts");
  process.exit(1);
}

// Find the closing backtick of content.js before background.js
const contentEndIdx = dataTs.lastIndexOf("`", nextFileIndex);
if (contentEndIdx === -1 || contentEndIdx < contentStartIdx) {
  console.error("Could not find closing backtick of content.js");
  process.exit(1);
}

// Escape backslashes, backticks and dollars for TS template literal
const escapedContent = newContent
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

const updatedDataTs = dataTs.substring(0, contentStartIdx + contentStartMarker.length) 
  + escapedContent 
  + dataTs.substring(contentEndIdx);

fs.writeFileSync(dataTsPath, updatedDataTs, 'utf8');
console.log("Successfully packed content.js back into src/data.ts!");
