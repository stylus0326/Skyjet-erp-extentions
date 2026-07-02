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

  if (!executablePath) {
    console.error('Không tìm thấy Chrome.');
    process.exit(1);
  }

  console.log(`Using Chrome: ${executablePath}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set viewport to see everything clearly
  await page.setViewport({ width: 1280, height: 1000 });

  try {
    console.log('Navigating to flightvn...');
    await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=SPA', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Current URL:', page.url());

    // Take a screenshot of the loaded page
    const screenshotPath = path.join('scratch', 'flightvn_screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Extract DOM info
    const content = await page.content();
    fs.writeFileSync(path.join('scratch', 'flightvn_page.html'), content, 'utf8');
    console.log('Page HTML saved to scratch/flightvn_page.html');

    // Extract input elements, textareas, forms
    const inputsInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
        return {
          index: i,
          id: f.id,
          action: f.getAttribute('action'),
          method: f.getAttribute('method'),
          className: f.className
        };
      });

      const inputs = Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => {
        return {
          tagName: el.tagName,
          id: el.id,
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          value: (el as any).value || '',
          placeholder: el.getAttribute('placeholder') || '',
          innerText: (el as any).innerText || '',
          className: el.className
        };
      });

      return { forms, inputs };
    });

    fs.writeFileSync(
      path.join('scratch', 'flightvn_inputs.json'),
      JSON.stringify(inputsInfo, null, 2),
      'utf8'
    );
    console.log('Inputs info saved to scratch/flightvn_inputs.json');

  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await browser.close();
  }
}

main();
