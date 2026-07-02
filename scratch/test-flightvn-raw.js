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
    console.log('Navigating to VNA page...');
    await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Performing POST fetch inside browser context...');
    const result = await page.evaluate(async () => {
      function cleanHtmlText(text) {
        return text
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function parseFlightVnHtml(html) {
        const tables = [];
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let match;
        while ((match = tableRegex.exec(html)) !== null) {
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

      function mapFlightVnDataToVnaResponse(tables) {
        const segmentsTable = tables[0] || [];
        const passengersTable = tables[1] || [];
        const ticketsTable = tables[2] || [];

        const flightSegments = [];
        for (let i = 1; i < segmentsTable.length; i++) {
          const row = segmentsTable[i];
          if (row.length < 7) continue;
          const flightCode = row[1] || '';
          const dateStr = row[2] || '';
          const timeStr = row[3] || '';
          const from = row[4] || '';
          const to = row[5] || '';
          
          let marketingAirlineCode = 'VN';
          let flightNumber = flightCode;
          const airlineMatch = flightCode.match(/^([A-Z0-9]{2})([0-9]+)$/i);
          if (airlineMatch) {
            marketingAirlineCode = airlineMatch[1].toUpperCase();
            flightNumber = airlineMatch[2];
          } else {
            marketingAirlineCode = flightCode.substring(0, 2).toUpperCase();
            flightNumber = flightCode.substring(2);
          }

          let departureDateTime = '';
          const dateParts = dateStr.split('/');
          if (dateParts.length === 3) {
            const day = dateParts[0];
            const month = dateParts[1];
            const year = dateParts[2];
            departureDateTime = `${year}-${month}-${day}T${timeStr}:00`;
          }

          flightSegments.push({
            marketingAirlineCode,
            flightNumber,
            departureLocationCode: from,
            arrivalLocationCode: to,
            departureDateTime
          });
        }

        const originDestinationOptions = flightSegments.length > 0 ? [{ flightSegments }] : [];

        const passengers = [];
        const ticketMap = {};
        for (let i = 1; i < ticketsTable.length; i++) {
          const row = ticketsTable[i];
          if (row.length >= 3) {
            const ticketNum = row[1];
            const passengerName = (row[2] || '').toUpperCase().trim();
            if (ticketNum && passengerName) {
              ticketMap[passengerName] = ticketNum;
            }
          }
        }

        for (let i = 1; i < passengersTable.length; i++) {
          const row = passengersTable[i];
          if (row.length >= 3) {
            const fullName = (row[1] || '').toUpperCase().trim();
            const title = (row[2] || '').toUpperCase().trim();
            const ticketNumber = ticketMap[fullName] || '';
            
            passengers.push({
              fullName,
              title,
              ticketNumber
            });
          }
        }

        return {
          reservation: {
            originDestinationOptions,
            passengers
          }
        };
      }

      // Fetch
      const formData = new FormData();
      formData.append('RecordLocation', 'DD5PSX');
      formData.append('AirlineId', 'VNA');
      formData.append('AirlineSpecified', 'True');
      formData.append('btnSearchBooking', 'Tra cứu');

      const response = await fetch('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        return { success: false, error: response.statusText };
      }

      const html = await response.text();
      const tables = parseFlightVnHtml(html);
      const mapped = mapFlightVnDataToVnaResponse(tables);
      return { success: true, data: mapped };
    });

    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
