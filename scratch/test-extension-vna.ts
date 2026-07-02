import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer-core';

const UNPACKED_DIR = path.resolve('scratch', 'debug-unpacked-extension');

async function main() {
  let executablePath = '';
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const possiblePaths = [
    path.join(homeDir, '.cache', 'puppeteer', 'chrome'),
    path.join(homeDir, '.cache', 'puppeteer', 'chrome-headless-shell')
  ];

  function findChromeExe(dir: string): string {
    if (!fs.existsSync(dir)) return '';
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const found = findChromeExe(fullPath);
        if (found) return found;
      } else if (file.toLowerCase() === 'chrome.exe') {
        return fullPath;
      }
    }
    return '';
  }

  for (const p of possiblePaths) {
    executablePath = findChromeExe(p);
    if (executablePath) break;
  }

  if (!executablePath) {
    const commonChromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of commonChromePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }
  }

  const userDataDir = path.resolve('scratch', 'puppeteer-user-data');
  console.log('Launching browser with extension...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    userDataDir,
    args: [
      `--disable-extensions-except=${UNPACKED_DIR}`,
      `--load-extension=${UNPACKED_DIR}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    console.log('Waiting for service worker...');
    const workerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker',
      { timeout: 10000 }
    );
    const workerUrl = workerTarget.url();
    console.log('Service worker found:', workerUrl);

    // Extract the extension ID
    const extensionId = workerUrl.split('/')[2];
    console.log('Detected Extension ID:', extensionId);

    const page = await browser.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    console.log('Navigating to extension popup page:', popupUrl);
    await page.goto(popupUrl, { waitUntil: 'networkidle2' });

    console.log('Sending message to background worker for PNR DD5PSX...');
    const testResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'fetch_vietnamairlines',
          pnr: 'DD5PSX',
          lastName: 'SAI',
          passengerName: 'SAI VAN HUNG',
          airlineId: 'VNA'
        }, (res) => {
          resolve(res);
        });
      });
    });

    console.log('Test Result:', JSON.stringify(testResult, null, 2));

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main().catch(console.error);
