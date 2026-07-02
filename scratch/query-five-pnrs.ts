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

  console.log('Using executable path:', executablePath);
  const userDataDir = path.resolve('scratch', 'puppeteer-user-data');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const pnrs = ['DPAP74', 'E700MQ', 'EQUUT5', 'FVJVBX', 'D7HIKY'];
  const results: Record<string, any> = {};

  try {
    console.log('Navigating to ImportBooking page for VNA...');
    await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    let currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // If redirected to login page, perform automatic login
    if (currentUrl.includes('/Login/') || currentUrl.includes('urlReturn=')) {
      console.log('Not logged in. Performing login...');
      await page.waitForSelector('input[name="username"]', { timeout: 15000 });
      await page.type('input[name="username"]', 'NV005501');
      await page.type('input[name="password"]', '@Time0326');
      await page.click('button[type="submit"]');
      
      console.log('Submitted credentials, waiting for either navigation or selector...');
      try {
        await page.waitForNavigation({ waitUntil: 'load', timeout: 15000 });
      } catch (e) {
        console.log('Navigation wait timed out/skipped, checking selector or URL directly.');
      }
      
      console.log('URL after login attempt:', page.url());
      
      // Let's explicitly navigate to ImportBooking if we aren't there yet
      if (!page.url().includes('/Booking/ImportBooking/')) {
        console.log('Manually navigating to ImportBooking page...');
        await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
      }
    }

    // Wait for the query form selector to confirm we are fully logged in and on the correct page
    console.log('Waiting for query form selector (#btn-search-booking or input)...');
    try {
      await page.waitForSelector('#record-location', { timeout: 15000 });
      console.log('Successfully loaded ImportBooking page and found input selector.');
    } catch (e) {
      console.log('Form selector not found, attempting queries anyway. Current page title:', await page.title());
    }

    for (const pnr of pnrs) {
      console.log(`Querying ${pnr}...`);
      const result = await page.evaluate(async (pnrCode) => {
        const formData = new FormData();
        formData.append('RecordLocation', pnrCode);
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

        // Check if there is a redirection/login needed response
        const docTitle = doc.querySelector('title')?.textContent || '';
        if (docTitle.toLowerCase().includes('đăng nhập') || html.includes('urlReturn=')) {
          return { success: false, error: 'Chưa đăng nhập FlightVN', title: docTitle };
        }

        const tables = Array.from(doc.querySelectorAll('table')).map((t, i) => {
          const headers = Array.from(t.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
          const rows = Array.from(t.querySelectorAll('tbody tr, tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
          }).filter(r => r.length > 0);
          return { index: i, headers, rows };
        });

        const ticketFace = doc.querySelector('#TicketFace')?.textContent?.trim() || '';
        
        return {
          success: true,
          tablesCount: tables.length,
          tables,
          ticketFace: ticketFace.substring(0, 1500),
          ticketFaceLength: ticketFace.length
        };
      }, pnr);

      console.log(`Result for ${pnr}:`, JSON.stringify(result, null, 2));
      results[pnr] = result;
    }

    fs.writeFileSync(
      path.resolve('scratch', 'five_pnrs_results.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );
    console.log('Results written to scratch/five_pnrs_results.json');

  } catch (err) {
    console.error('Error during run:', err);
  } finally {
    await browser.close();
  }
}

main();
