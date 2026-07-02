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
    headless: true,
    executablePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    const airlines = ['VIETJET', 'BAMBOO', 'VIETRAVEL', 'SPA', 'VNA'];
    for (const airline of airlines) {
      console.log(`Navigating to ImportBooking page for ${airline}...`);
      await page.goto(`https://flightvn.com/Booking/ImportBooking/?airlineId=${airline}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const url = page.url();
      console.log(`Page URL: ${url}`);
      if (url.includes('/Login')) {
        console.log(`Not logged in! Cannot inspect.`);
        break;
      }

      const inputs = await page.evaluate((airlineId) => {
        const formEl = document.querySelector('form');
        const action = formEl ? formEl.getAttribute('action') : null;
        const method = formEl ? formEl.getAttribute('method') : null;
        
        const inputsInfo = Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => {
          return {
            tagName: el.tagName,
            id: el.id,
            name: el.getAttribute('name'),
            type: el.getAttribute('type'),
            placeholder: el.getAttribute('placeholder') || '',
            value: (el as any).value || '',
            className: el.className
          };
        }).filter(el => el.name && el.name !== '__RequestVerificationToken');

        return { airlineId, action, method, inputsInfo };
      }, airline);

      console.log(JSON.stringify(inputs, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
