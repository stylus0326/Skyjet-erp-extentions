import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer-core';

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
  const browser = await puppeteer.launch({
    headless: true, // Run headless to check status silently
    executablePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    console.log('Navigating to ImportBooking page in headless mode...');
    await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const url = page.url();
    console.log('Current URL:', url);

    await page.screenshot({ path: path.join('scratch', 'status_check.png'), fullPage: true });
    console.log('Screenshot saved to scratch/status_check.png');

    const content = await page.content();
    fs.writeFileSync(path.join('scratch', 'status_page.html'), content, 'utf8');
    console.log('Page HTML saved to scratch/status_page.html');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
