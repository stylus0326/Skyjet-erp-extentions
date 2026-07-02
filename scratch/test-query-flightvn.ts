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
    console.log('Navigating to ImportBooking page for VNA...');
    await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Querying DPAP74...');
    const result = await page.evaluate(async () => {
      const formData = new FormData();
      formData.append('RecordLocation', 'DPAP74');
      formData.append('AirlineId', 'VNA');
      formData.append('AirlineSpecified', 'True');
      formData.append('btnSearchBooking', 'Tra cứu');

      const response = await fetch('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        return { success: false, status: response.status, statusText: response.statusText };
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const tables = Array.from(doc.querySelectorAll('table')).map((t, i) => {
        const headers = Array.from(t.querySelectorAll('th')).map(th => th.textContent.trim());
        const rows = Array.from(t.querySelectorAll('tbody tr, tr')).map(tr => {
          return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        }).filter(r => r.length > 0);
        return { index: i, headers, rows };
      });

      const ticketFace = doc.querySelector('#TicketFace')?.textContent || '';
      return { success: true, tables, ticketFaceLength: ticketFace.length, htmlContainsError: html.includes('Lỗi') || html.includes('error') || html.includes('không tìm thấy') };
    });

    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
