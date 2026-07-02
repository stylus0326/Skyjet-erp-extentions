import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const UNPACKED_DIR = path.resolve('scratch', 'debug-unpacked-extension');

async function main() {
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('Launching Chrome in non-headless mode...');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    args: [
      `--disable-extensions-except=${UNPACKED_DIR}`,
      `--load-extension=${UNPACKED_DIR}`,
      '--remote-debugging-port=9222',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  console.log('Chrome launched successfully on remote-debugging-port 9222!');
  
  const page = await browser.newPage();
  
  // Navigate to local port 3000 where the app is running
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  
  // Keep the process alive
  console.log('Browser is kept open. Press Ctrl+C to terminate.');
  await new Promise(() => {});
}

main().catch(console.error);
