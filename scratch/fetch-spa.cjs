const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

async function main() {
  let executablePath = '';
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const possiblePaths = [
    path.join(homeDir, '.cache', 'puppeteer', 'chrome'),
    path.join(homeDir, '.cache', 'puppeteer', 'chrome-headless-shell')
  ];

  function findChromeExe(dir) {
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
    console.log('Navigating to SPA page...');
    await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=SPA', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Performing POST fetch for SPA/DNYINQ inside browser...');
    const result = await page.evaluate(async () => {
      const formData = new FormData();
      formData.append('RecordLocation', 'DNYINQ');
      formData.append('AirlineId', 'SPA');
      formData.append('AirlineSpecified', 'True');
      formData.append('btnSearchBooking', 'Tra cứu');

      const response = await fetch('https://flightvn.com/Booking/ImportBooking/?airlineId=SPA', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        return { success: false, error: response.statusText };
      }

      const html = await response.text();
      return { success: true, html };
    });

    if (result.success) {
      fs.writeFileSync(path.join(__dirname, 'flightvn_spa_result.html'), result.html, 'utf8');
      console.log('HTML saved to scratch/flightvn_spa_result.html');

      // Now let's parse tables and show them
      function cleanHtmlText(text) {
        return text
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function parseFlightVnHtml(htmlText) {
        const tables = [];
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let match;
        while ((match = tableRegex.exec(htmlText)) !== null) {
          const tableContent = match[1];
          const rows = [];
          const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let trMatch;
          while ((trMatch = trRegex.exec(tableContent)) !== null) {
            const rowContent = trMatch[1];
            const cells = [];
            const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
              cells.push(cleanHtmlText(cellMatch[2]));
            }
            if (cells.length > 0) {
              rows.push(cells);
            }
          }
          tables.push(rows);
        }
        return tables;
      }

      const tables = parseFlightVnHtml(result.html);
      console.log("Total tables found in SPA result:", tables.length);
      tables.forEach((t, i) => {
        console.log(`Table ${i} has ${t.length} rows. First row:`, t[0]);
        if (t.length > 1) {
          console.log(`Table ${i} row 1:`, t[1]);
        }
      });

      const ticketFaceMatch = result.html.match(/<textarea[^>]*id="TicketFace"[^>]*>([\s\S]*?)<\/textarea>/i);
      if (ticketFaceMatch) {
        console.log('TicketFace found:\n', ticketFaceMatch[1]);
      } else {
        console.log('TicketFace not found');
      }

    } else {
      console.error('Fetch failed:', result.error);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
