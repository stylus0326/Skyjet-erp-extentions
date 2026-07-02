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

  const userDataDir = path.resolve('scratch', 'puppeteer-user-data');
  const browser = await puppeteer.launch({
    headless: true, // Let's run headless so it's fully automated!
    executablePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login page / ImportBooking redirect...');
    await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    let currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/Login/') || currentUrl.includes('urlReturn=')) {
      console.log('Đang thực hiện đăng nhập tự động...');
      
      // Wait for username & password inputs
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // Fill credentials
      await page.type('input[name="username"]', 'NV005501');
      await page.type('input[name="password"]', '@Time0326');

      // Click submit
      await page.click('button[type="submit"]');
      
      console.log('Đã submit credentials, chờ điều hướng...');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      console.log('URL sau khi đăng nhập:', page.url());
    }

    // Now go to ImportBooking directly just in case it didn't redirect automatically
    if (!page.url().includes('/Booking/ImportBooking/')) {
      console.log('Chuyển hướng thủ công sang trang ImportBooking...');
      await page.goto('https://flightvn.com/Booking/ImportBooking/?airlineId=VNA', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    }

    console.log('Đang ở trang ImportBooking:', page.url());

    // Wait for the form
    await page.waitForSelector('#record-location', { timeout: 10000 });

    // Enter PNR DD5PSX
    console.log('Điền PNR DD5PSX...');
    // Clear and type
    await page.click('#record-location', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#record-location', 'DD5PSX');

    // Screenshot page before search
    await page.screenshot({ path: path.join('scratch', 'before_search.png') });

    // Click search button
    console.log('Nhấn nút Tra cứu...');
    await page.click('#btn-search-booking');

    // Wait for search result to load (e.g. wait for selector containing booking information)
    console.log('Chờ kết quả...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Save final page HTML
    const resultHtml = await page.content();
    fs.writeFileSync(path.join('scratch', 'flightvn_result_page.html'), resultHtml, 'utf8');
    console.log('Đã lưu trang HTML kết quả vào scratch/flightvn_result_page.html');

    // Chụp ảnh màn hình kết quả
    await page.screenshot({ path: path.join('scratch', 'flightvn_result.png'), fullPage: true });
    console.log('Đã chụp ảnh kết quả lưu vào scratch/flightvn_result.png');

    // Phân tích dữ liệu trích xuất
    const extractedData = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table')).map((t, i) => {
        const headers = Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim());
        const rows = Array.from(t.querySelectorAll('tbody tr, tr')).map(tr => {
          return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        }).filter(r => r.length > 0);
        return { index: i, headers, rows };
      });
      return { tables, url: window.location.href };
    });

    fs.writeFileSync(
      path.join('scratch', 'flightvn_extracted_data.json'),
      JSON.stringify(extractedData, null, 2),
      'utf8'
    );
    console.log('Extracted JSON data saved.');

  } catch (error) {
    console.error('Lỗi khi chạy script:', error);
    // Take error screenshot
    try {
      await page.screenshot({ path: path.join('scratch', 'error.png') });
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

main();
