import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extensionFiles } from './src/data';

const TARGET_DIR = path.join(os.homedir(), 'Desktop', 'Skyjet ERP Helper');
const ICONS_DIR = path.join(TARGET_DIR, 'icons');

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const tinyPngBuffer = Buffer.from(TINY_PNG_BASE64, 'base64');

function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

async function main() {
  console.log(`\n--- Auto Exporting Extension to: ${TARGET_DIR} ---`);
  try {
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }
    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    // 1. Copy Vite production React bundle if it exists
    const distDir = path.resolve('dist');
    if (fs.existsSync(distDir)) {
      console.log(`Copying React app from ${distDir} to ${TARGET_DIR}...`);
      copyRecursiveSync(distDir, TARGET_DIR);
    }

    // 2. Write the extension files
    for (const file of extensionFiles) {
      const filePath = path.join(TARGET_DIR, file.path);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, file.content, 'utf8');
      console.log(`Written: ${file.path}`);
    }

    // 3. Write the icons
    const iconSourcePath = path.resolve('assets', 'icon.png');
    const iconBuffer = fs.existsSync(iconSourcePath)
      ? fs.readFileSync(iconSourcePath)
      : tinyPngBuffer;
    
    fs.writeFileSync(path.join(ICONS_DIR, 'icon16.png'), iconBuffer);
    fs.writeFileSync(path.join(ICONS_DIR, 'icon48.png'), iconBuffer);
    fs.writeFileSync(path.join(ICONS_DIR, 'icon128.png'), iconBuffer);
    console.log('Written icons (icon16.png, icon48.png, icon128.png).');
    console.log('--- Export Completed successfully! ---\n');
  } catch (err) {
    console.error('Error during auto-export:', err);
  }
}

main();
