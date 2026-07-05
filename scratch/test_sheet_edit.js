import puppeteer from 'puppeteer-core';
import * as path from 'path';

const chromePath = 'C:\\Users\\H.I.N\\.cache\\puppeteer\\chrome\\win64-150.0.7871.24\\chrome-win64\\chrome.exe';
const sheetUrl = 'https://docs.google.com/spreadsheets/d/1pF3hzq0pIXUujZvHo-KuZSwhfvLKXFAdz4XKjTNxHU0/edit?pli=1&gid=1548491598#gid=1548491598'; // Checklist tab

async function run() {
  console.log('Starting Puppeteer to check Google Sheet edit permissions...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    console.log(`Navigating to ${sheetUrl}...`);
    await page.goto(sheetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting for spreadsheet interface to load...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check if the spreadsheet is "View only"
    const viewOnlyExists = await page.evaluate(() => {
      // Look for "View only" text or elements in Google Sheets header
      const bodyText = document.body.innerText;
      return bodyText.includes('View only') || bodyText.includes('Chỉ xem') || !!document.querySelector('.docs-tool-view-only');
    });

    console.log('Spreadsheet is View Only:', viewOnlyExists);

    const screenshotPath = path.resolve('C:\\Users\\H.I.N\\.gemini\\antigravity\\brain\\33765bd3-f9a1-4b7f-b9c9-8b6ffea5bd0c\\scratch\\sheet_check.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
