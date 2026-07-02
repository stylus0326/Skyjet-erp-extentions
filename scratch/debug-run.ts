import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer-core';
import { extensionFiles } from '../src/data';

const UNPACKED_DIR = path.resolve('scratch', 'debug-unpacked-extension');
const ICONS_DIR = path.resolve(UNPACKED_DIR, 'icons');

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const tinyPngBuffer = Buffer.from(TINY_PNG_BASE64, 'base64');

async function main() {
  console.log('--- 1. Xuất file extension ---');
  if (fs.existsSync(UNPACKED_DIR)) {
    fs.rmSync(UNPACKED_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(UNPACKED_DIR, { recursive: true });
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }


  for (const file of extensionFiles) {
    const filePath = path.resolve(UNPACKED_DIR, file.path);
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    fs.writeFileSync(filePath, file.content, 'utf8');
    console.log(`Đã ghi file: ${file.path}`);
  }

  const iconBuffer = fs.existsSync(path.resolve('assets', 'icon.png'))
    ? fs.readFileSync(path.resolve('assets', 'icon.png'))
    : tinyPngBuffer;
  fs.writeFileSync(path.resolve(ICONS_DIR, 'icon16.png'), iconBuffer);
  fs.writeFileSync(path.resolve(ICONS_DIR, 'icon48.png'), iconBuffer);
  fs.writeFileSync(path.resolve(ICONS_DIR, 'icon128.png'), iconBuffer);
  console.log('Đã ghi các file icon PNG.');

  console.log('\n--- 2. Khởi động Puppeteer ---');
  
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
    console.error('Không tìm thấy trình duyệt Chrome để chạy debug.');
    process.exit(1);
  }

  console.log(`Sử dụng Chrome tại: ${executablePath}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      `--disable-extensions-except=${UNPACKED_DIR}`,
      `--load-extension=${UNPACKED_DIR}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.method() === 'OPTIONS') {
        req.respond({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'x-requested-with, content-type, authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE'
          }
        });
        return;
      }

      const url = req.url();
      if (url.includes('supabase.co/rest/v1/vna_ticket_cache')) {
        console.log(`[PUPPETEER MOCK REST] Supabase cache check request intercepted: ${url}`);
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'x-requested-with, content-type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
          },
          body: JSON.stringify([
            {
              id: 1,
              created_at: new Date().toISOString(),
              ticket_number: '7382321383143',
              pnr_code: 'E6F77K',
              ticket_type: 'Vé bán',
              ticket_class: 'R',
              fare: 3741000,
              passenger_name: 'DONG MOI'
            }
          ])
        });
      } else if (url.includes('/OrderReportArea/OrderReport/SearchAllOrder')) {
        console.log(`[PUPPETEER MOCK REST] SearchAllOrder request intercepted: ${url}`);
        req.respond({
          status: 200,
          contentType: 'text/html',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'x-requested-with, content-type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
          },
          body: `
            <table id="gridItem">
              <thead>
                <tr>
                  <th>Số vé</th>
                  <th>Hạng</th>
                  <th>Loại vé</th>
                  <th>Tên khách</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>7382321383143</td>
                  <td>R</td>
                  <td>Vé bán</td>
                  <td>DONG MOI</td>
                </tr>
                <tr>
                  <td>126-2910293102</td>
                  <td>R</td>
                  <td>Vé đoàn</td>
                  <td>NGUYEN VAN A</td>
                </tr>
                <tr>
                  <td>126-2910293103</td>
                  <td>R</td>
                  <td>Vé lẻ</td>
                  <td>NGUYEN VAN B MSTR</td>
                </tr>
                <tr>
                  <td>126-2910293104</td>
                  <td>R</td>
                  <td>Vé đoàn</td>
                  <td>NGUYEN VAN C</td>
                </tr>
              </tbody>
            </table>
          `
        });
      } else {
        req.continue();
      }
    });

    page.on('console', (msg) => {
      console.log(`[PAGE CONSOLE] [${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      console.error(`[PAGE ERROR] ${err.toString()}`);
    });

    console.log('Nạp trang kiểm thử chứa bảng giao dịch công nợ...');
    await page.goto('data:text/html;charset=utf-8,<html>' +
      '<head><title>Mock SearchTransaction</title></head>' +
      '<body>' +
      '  <h2>Danh sách công nợ hiện tại</h2>' +
      '  <table id="tableContent" border="1">' +
      '    <thead>' +
      '      <tr>' +
      '        <th>STT</th>' +
      '        <th>Mã ĐH</th>' +
      '        <th>Loại vé</th>' +
      '        <th>Diễn giải</th>' +
      '        <th>Giá bán</th>' +
      '      </tr>' +
      '    </thead>' +
      '    <tbody>' +
      '      <tr>' +
      '        <td>1</td>' +
      '        <td><div class="skyjet-btn"><span>DH123</span></div></td>' +
      '        <td>Vé đoàn</td>' +
      '        <td>126-2910293102 - VN HUIVNSGN - NGUYEN VAN A</td>' +
      '        <td>1,500,000</td>' +
      '      </tr>' +
      '      <tr>' +
      '        <td>2</td>' +
      '        <td>0</td>' +
      '        <td>Vé lẻ</td>' +
      '        <td>Dòng không có mã đơn hàng</td>' +
      '        <td>0</td>' +
      '      </tr>' +
      '      <tr>' +
      '        <td>3</td>' +
      '        <td><div class="skyjet-btn"><span>DH456</span></div></td>' +
      '        <td>Vé lẻ</td>' +
      '        <td>126-2910293103 - VJ SGNVJHUI - NGUYEN VAN B MSTR</td>' +
      '        <td>200,000</td>' +
      '      </tr>' +
      '      <tr>' +
      '        <td>4</td>' +
      '        <td><div class="skyjet-btn"><span>DH789</span></div></td>' +
      '        <td>Vé đoàn</td>' +
      '        <td>126-2910293104 - HUIVNSGNVJHUI - NGUYEN VAN C</td>' +
      '        <td>3,000,000</td>' +
      '      </tr>' +
      '      <tr>' +
      '        <td>5</td>' +
      '        <td><div class="skyjet-btn"><span>E6F77K</span></div></td>' +
      '        <td>Vé bán</td>' +
      '        <td>7382321383143 - VN SGNVNHUI - DONG MOI</td>' +
      '        <td>4,000,000</td>' +
      '      </tr>' +
      '      <tr>' +
      '        <td>6</td>' +
      '        <td><div class="skyjet-btn"><span>E6F77K</span></div></td>' +
      '        <td>Vé bán</td>' +
      '        <td>7382321383143-H\u200b - VN SGNVNHUI - HOAN VE</td>' +
      '        <td>-500,000</td>' +
      '      </tr>' +
    '    </tbody>' +
    '  </table>' +
    '</body></html>'
  );

  await page.evaluate(`
    const mockStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0
    };
    Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true });

    window.__chrome_storage = {
      skyjet_split_desc: false,
      skyjet_dark_mode: true,
      skyjet_pending_search: null
    };

    window.chrome = {
      storage: {
        local: {
          get: (keys, callback) => {
            const result = {};
            if (typeof keys === 'string') {
              result[keys] = window.__chrome_storage[keys];
            } else if (Array.isArray(keys)) {
              keys.forEach(k => {
                result[k] = window.__chrome_storage[k];
              });
            } else if (typeof keys === 'object' && keys !== null) {
              Object.keys(keys).forEach(k => {
                result[k] = window.__chrome_storage[k] !== undefined ? window.__chrome_storage[k] : keys[k];
              });
            } else {
              Object.assign(result, window.__chrome_storage);
            }
            if (callback) callback(result);
          },
          set: (data, callback) => {
            Object.assign(window.__chrome_storage, data);
            if (callback) callback();
          },
          remove: (keys, callback) => {
            if (typeof keys === 'string') {
              delete window.__chrome_storage[keys];
            } else if (Array.isArray(keys)) {
              keys.forEach(k => {
                delete window.__chrome_storage[k];
              });
            }
            if (callback) callback();
          }
        }
      },
      runtime: {
        id: 'mock-id',
        onMessage: {
          addListener: (fn) => {
            window.__mock_message_listener = fn;
          }
        },
        sendMessage: (message, callback) => {
          console.log('[MOCK chrome.runtime.sendMessage] received:', message);
          if (message.action === 'check_ticket_cache') {
            const response = {
              success: true,
              data: [
                {
                  id: 1,
                  created_at: new Date().toISOString(),
                  ticket_number: '7382321383143',
                  pnr_code: 'E6F77K',
                  ticket_type: 'Vé bán',
                  ticket_class: 'R',
                  fare: 3741000,
                  passenger_name: 'DONG MOI',
                  channel: 'Vietnam Airlines',
                  json_data: JSON.stringify([
                    {
                      departureTime: '2026-06-21T18:00:00Z',
                      origin: 'SGN',
                      destination: 'HUI'
                    }
                  ])
                }
              ]
            };
            if (callback) callback(response);
          } else if (message.action === 'fetch_vietnamairlines') {
            const response = {
              success: true,
              data: {
                reservation: {
                  originDestinationOptions: [
                    {
                      flightSegments: [
                        {
                          departureTime: '2026-06-21T18:00:00Z',
                          origin: 'SGN',
                          destination: 'HUI'
                        }
                      ]
                    }
                  ],
                  passengers: []
                }
              },
              fare: 3741000
            };
            if (callback) callback(response);
          } else {
            if (callback) callback({ success: true });
          }
        }
      }
    };
  `);

  console.log('Inject content scripts...');
  await page.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'global.js') });
  await page.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'search-transaction.js') });
  await page.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'agency-sales.js') });


  await page.evaluate(`
    if (typeof window.initSkyjetHelper === 'function') {
      window.initSkyjetHelper();
      console.log('[Puppeteer] initSkyjetHelper initiated.');
    }
  `);

  let headers = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent thead th')).map(th => th.innerText.trim())
  `) as any;
  console.log('Original headers:', headers);
  if (!headers || typeof headers.includes !== 'function') {
    throw new Error('headers is not returning an array or headers.includes is not a function: ' + JSON.stringify(headers));
  }
  if (!headers.includes('Diễn giải')) {
    throw new Error('Không tìm thấy cột Diễn giải ban đầu.');
  }

  console.log('Kích hoạt Tách diễn giải (skyjet_split_desc = true)...');
  await page.evaluate(`
    window.__chrome_storage.skyjet_split_desc = true;
    if (typeof window.handleSplitDescription === 'function') {
      window.handleSplitDescription();
    }
  `);

  headers = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent thead th')).map(th => th.innerText.trim())
  `) as string[];
  console.log('Split headers:', headers);
  if (!headers.includes('Số vé') || !headers.includes('Hành trình') || !headers.includes('Tên khách') || headers.includes('Diễn giải')) {
    throw new Error('Tách diễn giải thất bại, không tìm thấy các cột mới hoặc cột cũ chưa bị xóa.');
  }

  // Verify "Loại vé" sits before "Hành trình"
  const loaiVeIndex = headers.indexOf('Loại vé');
  const routeIndex = headers.indexOf('Hành trình');
  console.log(`Index of 'Loại vé': ${loaiVeIndex}, 'Hành trình': ${routeIndex}`);
  if (loaiVeIndex === -1 || routeIndex === -1 || loaiVeIndex !== routeIndex - 1) {
    throw new Error("Cột 'Loại vé' phải nằm ngay trước cột 'Hành trình'");
  }

  const row1CellsBefore = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent tbody tr:nth-child(1) td')).map(td => td.innerText.trim())
  `) as string[];
  console.log('Row 1 before checking:', row1CellsBefore);
  // STT (0), Mã ĐH (1), Số vé (2), Loại vé (3), Hành trình (4), Tên khách (5), Giá bán (6)
  if (row1CellsBefore[2] !== '126-2910293102' || row1CellsBefore[3] !== 'Vé đoàn' || row1CellsBefore[4] !== 'HUI-SGN' || row1CellsBefore[5] !== 'NGUYEN VAN A') {
    throw new Error('Dữ liệu phân tách dòng 1 trước check không khớp: ' + JSON.stringify(row1CellsBefore));
  }

  const row2Cells = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent tbody tr:nth-child(2) td')).map(td => td.innerText.trim())
  `) as string[];
  console.log('Row 2 (bypassed with no order code):', row2Cells);
  if (row2Cells[2] !== '' || row2Cells[3] !== 'Vé lẻ' || row2Cells[4] !== '' || row2Cells[5] !== 'Dòng không có mã đơn hàng') {
    throw new Error('Dữ liệu phân tách dòng 2 (không có mã đơn hàng) không khớp: ' + JSON.stringify(row2Cells));
  }

  const row3Cells = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent tbody tr:nth-child(3) td')).map(td => td.innerText.trim())
  `) as string[];
  console.log('Row 3 (split with order code, carrier VJ SGNVJHUI, passenger MSTR):', row3Cells);
  if (row3Cells[4] !== 'SGN-HUI') {
    throw new Error('Dữ liệu phân tách hành trình dòng 3 không đúng: ' + row3Cells[4]);
  }
  if (!row3Cells[3].endsWith('*')) {
    throw new Error("Vé lẻ của hành khách MSTR dòng 3 phải được gắn thêm dấu '*': " + row3Cells[3]);
  }

  const row4Cells = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent tbody tr:nth-child(4) td')).map(td => td.innerText.trim())
  `) as string[];
  console.log('Row 4 (split with order code, 3 segments HUIVNSGNVJHUI):', row4Cells);
  if (row4Cells[4] !== 'HUI-SGN-HUI') {
    throw new Error('Dữ liệu phân tách hành trình dòng 4 không đúng: ' + row4Cells[4]);
  }

  console.log('Kích hoạt Kiểm tra bằng cách click button...');
  await page.click('#skyjet-check-btn');

  // Chờ cho MutationObserver chạy xong việc query Supabase và render (nếu có delay bất đồng bộ)
  console.log('Chờ 1.5 giây để MutationObserver thực hiện so khớp và render kết quả từ Supabase...');
  await new Promise(resolve => setTimeout(resolve, 1500));

  headers = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent thead th')).map(th => th.innerText.trim())
  `) as string[];
  console.log('Headers after checking:', headers);

  // Verify "Giá vé" sits directly before "Giá bán"
  const giaVeIndex = headers.indexOf('Giá vé');
  const giaBanIndex = headers.indexOf('Giá bán');
  console.log(`Index of 'Giá vé': ${giaVeIndex}, 'Giá bán': ${giaBanIndex}`);
  if (giaVeIndex === -1 || giaBanIndex === -1 || giaVeIndex !== giaBanIndex - 1) {
    throw new Error("Cột 'Giá vé' phải nằm ngay trước cột 'Giá bán'");
  }

  const row1Cells = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent tbody tr:nth-child(1) td')).map(td => td.innerText.trim())
  `) as string[];
  console.log('Row 1 after checking:', row1Cells);
  if (row1Cells[giaVeIndex] !== '-') {
    throw new Error('Dòng 1: Giá vé không đúng, mong đợi "-", thực tế: ' + row1Cells[giaVeIndex]);
  }

  // Verify column values using dynamic indices
  const soVeIndexAfter = headers.indexOf('Số vé');
  const loaiVeIndexAfter = headers.indexOf('Loại vé');
  console.log(`Indices after checking - Số vé: ${soVeIndexAfter}, Loại vé: ${loaiVeIndexAfter}`);

  const row5Cells = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent tbody tr:nth-child(5) td')).map(td => td.innerText.trim())
  `) as string[];
  console.log('Row 5 (original ticket):', row5Cells);
  if (row5Cells[soVeIndexAfter] !== '7382321383143') {
    throw new Error('Dòng 5: số vé không đúng: ' + row5Cells[soVeIndexAfter]);
  }
  if (row5Cells[loaiVeIndexAfter] !== 'Vé bán') {
    throw new Error('Dòng 5: loại vé không đúng, mong đợi "Vé bán", thực tế: ' + row5Cells[loaiVeIndexAfter]);
  }
  if (row5Cells[giaVeIndex] !== '3.741.000') {
    throw new Error('Dòng 5: Giá vé không đúng, mong đợi "3.741.000", thực tế: ' + row5Cells[giaVeIndex]);
  }

  const row6Cells = await page.evaluate(`
    Array.from(document.querySelectorAll('#tableContent tbody tr:nth-child(6) td')).map(td => td.innerText.trim())
  `) as string[];
  console.log('Row 6 (refund ticket):', row6Cells);
  if (row6Cells[loaiVeIndexAfter] !== 'Hoàn') {
    throw new Error('Dòng 6: loại vé không đúng, mong đợi "Hoàn", thực tế: ' + row6Cells[loaiVeIndexAfter]);
  }
  if (row6Cells[giaVeIndex] !== '-') {
    throw new Error('Dòng 6: Giá vé không đúng, mong đợi "-", thực tế: ' + row6Cells[giaVeIndex]);
  }

    console.log('Hủy kích hoạt Tách diễn giải (skyjet_split_desc = false)...');
    await page.evaluate(`
      window.__chrome_storage.skyjet_split_desc = false;
      if (typeof window.handleSplitDescription === 'function') {
        window.handleSplitDescription();
      }
    `);

    headers = await page.evaluate(`
      Array.from(document.querySelectorAll('#tableContent thead th')).map(th => th.innerText.trim())
    `) as string[];
    console.log('Reverted headers:', headers);
    if (!headers.includes('Diễn giải') || headers.includes('Số vé')) {
      throw new Error('Khôi phục bảng thất bại.');
    }

    console.log('\n--- 3. Kiểm thử luồng AgencySales truyền qua SearchTransaction ---');
    const autoSearchPage = await browser.newPage();
    autoSearchPage.on('console', (msg) => {
      console.log(`[AUTO SEARCH PAGE CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    autoSearchPage.on('pageerror', (err) => {
      console.error(`[AUTO SEARCH PAGE ERROR] ${err.toString()}`);
    });

    console.log('Mở trang SearchTransaction mock với các tham số query...');
    await autoSearchPage.goto('data:text/html;charset=utf-8,<html>' +
      '<head><title>Mock SearchTransaction Form</title></head>' +
      '<body>' +
      '  <form id="searchForm" onsubmit="event.preventDefault(); window.__form_submitted = true;">' +
      '    <select id="agentId" name="AgentId">' +
      '      <option value="">--Chọn đại lý--</option>' +
      '      <option value="AG123">Đại lý AG123</option>' +
      '      <option value="AG456">Đại lý AG456</option>' +
      '    </select>' +
      '    <input type="date" id="fromDate" name="FromDate" value="" />' +
      '    <input type="date" id="toDate" name="ToDate" value="" />' +
      '    <button type="submit" id="btnSearch">Tìm kiếm</button>' +
      '  </form>' +
      '</body></html>' +
      '?skyjetAgentId=AG123&skyjetFromDate=20/06/2026&skyjetToDate=21/06/2026'
    );

    // Cài đặt mock session và local storage như trang đầu
    await autoSearchPage.evaluate(`
      const mockStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0
      };
      Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true });
      Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true });
      
      window.__chrome_storage = {
        skyjet_split_desc: false,
        skyjet_dark_mode: false,
        skyjet_pending_search: null
      };

      window.chrome = {
        storage: {
          local: {
            get: (keys, callback) => {
              const result = {};
              if (typeof keys === 'string') {
                result[keys] = window.__chrome_storage[keys];
              } else if (Array.isArray(keys)) {
                keys.forEach(k => {
                  result[k] = window.__chrome_storage[k];
                });
              } else if (typeof keys === 'object' && keys !== null) {
                Object.keys(keys).forEach(k => {
                  result[k] = window.__chrome_storage[k] !== undefined ? window.__chrome_storage[k] : keys[k];
                });
              } else {
                Object.assign(result, window.__chrome_storage);
              }
              if (callback) callback(result);
            },
            set: (data, callback) => {
              Object.assign(window.__chrome_storage, data);
              if (callback) callback();
            },
            remove: (keys, callback) => {
              if (typeof keys === 'string') {
                delete window.__chrome_storage[keys];
              } else if (Array.isArray(keys)) {
                keys.forEach(k => {
                  delete window.__chrome_storage[k];
                });
              }
              if (callback) callback();
            }
          }
        },
        runtime: {
          id: 'mock-id'
        }
      };
      window.__form_submitted = false;

      // Mock URLSearchParams vì data URI không truyền được query parameters qua window.location.search một cách ổn định
      class MockURLSearchParams {
        constructor() {
          this.params = new Map([
            ['skyjetAgentId', 'AG123'],
            ['skyjetFromDate', '20/06/2026'],
            ['skyjetToDate', '21/06/2026']
          ]);
        }
        get(key) {
          return this.params.get(key);
        }
        has(key) {
          return this.params.has(key);
        }
      }
      window.URLSearchParams = MockURLSearchParams;
    `);

    console.log('Inject content scripts vào trang auto search...');
    await autoSearchPage.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'global.js') });
    await autoSearchPage.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'search-transaction.js') });
    await autoSearchPage.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'agency-sales.js') });

    await autoSearchPage.evaluate(`
      if (typeof window.initSkyjetHelper === 'function') {
        window.initSkyjetHelper();
      }
    `);

    console.log('Chờ 1.5 giây để form tự động điền và submit...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Kiểm tra xem các trường đã được điền đúng chưa
    const formVals = await autoSearchPage.evaluate(`
      ({
        agentId: document.getElementById('agentId').value,
        fromDate: document.getElementById('fromDate').value,
        toDate: document.getElementById('toDate').value,
        submitted: window.__form_submitted
      })
    `) as any;

    console.log('Kết quả điền form tự động:', formVals);

    if (formVals.fromDate !== '2026-06-20') {
      throw new Error('Từ ngày chưa được điền chính xác, mong đợi "2026-06-20", thực tế: ' + formVals.fromDate);
    }
    if (formVals.toDate !== '2026-06-21') {
      throw new Error('Đến ngày chưa được điền chính xác, mong đợi "2026-06-21", thực tế: ' + formVals.toDate);
    }
    if (!formVals.submitted) {
      throw new Error('Form chưa được tự động submit!');
    }
    console.log('Xác minh luồng truyền tham số tự động thành công!');
 
    console.log('\n--- 4. Kiểm thử luồng truyền mã qua SearchAllOrder ---');
    
    // --- 4A. Kiểm thử tự điền bằng chrome.storage.local (Cách chính mới) ---
    console.log('\n--- 4A. Kiểm thử tự điền bằng chrome.storage.local ---');
    const orderSearchPage = await browser.newPage();
    
    await orderSearchPage.setRequestInterception(true);
    orderSearchPage.on('request', (req) => {
      if (req.url().includes('/OrderReportArea/OrderReport/SearchAllOrder')) {
        req.respond({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<html>
<head><title>Mock SearchAllOrder Form</title></head>
<body>
  <form id="orderForm" onsubmit="event.preventDefault(); window.__order_submitted = true;">
    <input type="text" id="ticketPnrInput" placeholder="Số vé hoặc PNR" value="" />
    <button type="submit" id="btnSearchOrder">Tìm Kiếm</button>
  </form>
</body>
</html>`
        });
      } else {
        req.continue();
      }
    });

    orderSearchPage.on('console', (msg) => {
      console.log(`[ORDER SEARCH 4A CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    orderSearchPage.on('pageerror', (err) => {
      console.error(`[ORDER SEARCH 4A ERROR] ${err.toString()}`);
    });

    console.log('Mở trang SearchAllOrder mock (không có query params)...');
    await orderSearchPage.goto('https://erp.skyjet.vn/OrderReportArea/OrderReport/SearchAllOrder');

    console.log('Cài đặt mock chrome.storage.local chứa pending search...');
    await orderSearchPage.evaluate(`
      const mockStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0
      };
      Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true });
      Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true });
      
      window.__chrome_storage = {
        skyjet_split_desc: false,
        skyjet_dark_mode: false,
        skyjet_pending_search: ${JSON.stringify({
          value: 'TICKET-FROM-STORAGE-999',
          timestamp: Date.now()
        })}
      };

      window.chrome = {
        storage: {
          local: {
            get: (keys, callback) => {
              const result = {};
              if (typeof keys === 'string') {
                result[keys] = window.__chrome_storage[keys];
              } else if (Array.isArray(keys)) {
                keys.forEach(k => {
                  result[k] = window.__chrome_storage[k];
                });
              } else if (typeof keys === 'object' && keys !== null) {
                Object.keys(keys).forEach(k => {
                  result[k] = window.__chrome_storage[k] !== undefined ? window.__chrome_storage[k] : keys[k];
                });
              } else {
                Object.assign(result, window.__chrome_storage);
              }
              if (callback) callback(result);
            },
            set: (data, callback) => {
              Object.assign(window.__chrome_storage, data);
              if (callback) callback();
            },
            remove: (keys, callback) => {
              if (typeof keys === 'string') {
                delete window.__chrome_storage[keys];
              } else if (Array.isArray(keys)) {
                keys.forEach(k => {
                  delete window.__chrome_storage[k];
                });
              }
              if (callback) callback();
            }
          }
        },
        runtime: {
          id: 'mock-id'
        }
      };
      
      window.__order_submitted = false;
    `);

    console.log('Inject content scripts vào trang order search (4A)...');
    await orderSearchPage.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'global.js') });
    await orderSearchPage.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'search-transaction.js') });
    await orderSearchPage.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'agency-sales.js') });

    await orderSearchPage.evaluate(`
      if (typeof window.initSkyjetHelper === 'function') {
        window.initSkyjetHelper();
      }
    `);

    console.log('Chờ 1.5 giây để form SearchAllOrder tự động điền và submit...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const orderFormVals4A = await orderSearchPage.evaluate(`
      ({
        inputValue: document.getElementById('ticketPnrInput').value,
        submitted: window.__order_submitted,
        storageAfterRemove: window.__chrome_storage.skyjet_pending_search
      })
    `) as any;

    console.log('Kết quả điền form từ storage (4A):', orderFormVals4A);

    if (orderFormVals4A.inputValue !== 'TICKET-FROM-STORAGE-999') {
      throw new Error('Số vé/PNR chưa được điền chính xác từ local storage, mong đợi "TICKET-FROM-STORAGE-999", thực tế: ' + orderFormVals4A.inputValue);
    }
    if (!orderFormVals4A.submitted) {
      throw new Error('Form SearchAllOrder chưa được tự động submit từ local storage!');
    }
    if (orderFormVals4A.storageAfterRemove !== null && orderFormVals4A.storageAfterRemove !== undefined) {
      throw new Error('Pending search trong local storage chưa được xóa sau khi sử dụng! Thực tế: ' + JSON.stringify(orderFormVals4A.storageAfterRemove));
    }
    console.log('Xác minh luồng truyền mã qua chrome.storage.local thành công!');

    // --- 4B. Kiểm thử tự điền bằng URL query parameters (Fallback) ---
    console.log('\n--- 4B. Kiểm thử tự điền bằng URL query parameters (Fallback) ---');
    const orderSearchPageFB = await browser.newPage();
    
    await orderSearchPageFB.setRequestInterception(true);
    orderSearchPageFB.on('request', (req) => {
      if (req.url().includes('/OrderReportArea/OrderReport/SearchAllOrder')) {
        req.respond({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<html>
<head><title>Mock SearchAllOrder Form Fallback</title></head>
<body>
  <form id="orderFormFallback" onsubmit="event.preventDefault(); window.__order_submitted_fb = true;">
    <input type="text" id="ticketPnrInputFB" placeholder="Số vé hoặc PNR" value="" />
    <button type="submit" id="btnSearchOrderFB">Tìm Kiếm</button>
  </form>
</body>
</html>`
        });
      } else {
        req.continue();
      }
    });

    orderSearchPageFB.on('console', (msg) => {
      console.log(`[ORDER SEARCH 4B CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    orderSearchPageFB.on('pageerror', (err) => {
      console.error(`[ORDER SEARCH 4B ERROR] ${err.toString()}`);
    });

    console.log('Mở trang SearchAllOrder mock với query params...');
    await orderSearchPageFB.goto('https://erp.skyjet.vn/OrderReportArea/OrderReport/SearchAllOrder?OrderReferenceId=DPAP74FB&TicketNumber=7382321356263FB&PNR=MOCKPNR123');

    await orderSearchPageFB.evaluate(`
      const mockStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0
      };
      Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true });
      Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true });
      
      window.__chrome_storage = {
        skyjet_split_desc: false,
        skyjet_dark_mode: false,
        skyjet_pending_search: null
      };

      window.chrome = {
        storage: {
          local: {
            get: (keys, callback) => {
              const result = {};
              if (typeof keys === 'string') {
                result[keys] = window.__chrome_storage[keys];
              } else if (Array.isArray(keys)) {
                keys.forEach(k => {
                  result[k] = window.__chrome_storage[k];
                });
              } else if (typeof keys === 'object' && keys !== null) {
                Object.keys(keys).forEach(k => {
                  result[k] = window.__chrome_storage[k] !== undefined ? window.__chrome_storage[k] : keys[k];
                });
              } else {
                Object.assign(result, window.__chrome_storage);
              }
              if (callback) callback(result);
            },
            set: (data, callback) => {
              Object.assign(window.__chrome_storage, data);
              if (callback) callback();
            },
            remove: (keys, callback) => {
              if (typeof keys === 'string') {
                delete window.__chrome_storage[keys];
              } else if (Array.isArray(keys)) {
                keys.forEach(k => {
                  delete window.__chrome_storage[k];
                });
              }
              if (callback) callback();
            }
          }
        },
        runtime: {
          id: 'mock-id'
        }
      };
      
      window.__order_submitted_fb = false;

      // Mock URLSearchParams cho fallback test
      class MockURLSearchParams {
        constructor() {
          this.params = new Map([
            ['OrderReferenceId', 'DPAP74FB'],
            ['TicketNumber', '7382321356263FB'],
            ['PNR', 'MOCKPNR123']
          ]);
        }
        get(key) {
          return this.params.get(key);
        }
        has(key) {
          return this.params.has(key);
        }
      }
      window.URLSearchParams = MockURLSearchParams;
    `);

    console.log('Inject content scripts vào trang order search (4B)...');
    await orderSearchPageFB.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'global.js') });
    await orderSearchPageFB.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'search-transaction.js') });
    await orderSearchPageFB.addScriptTag({ path: path.resolve(UNPACKED_DIR, 'agency-sales.js') });

    await orderSearchPageFB.evaluate(`
      if (typeof window.initSkyjetHelper === 'function') {
        window.initSkyjetHelper();
      }
    `);

    console.log('Chờ 1.5 giây để form SearchAllOrder tự động điền từ URL và submit...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const orderFormVals4B = await orderSearchPageFB.evaluate(`
      ({
        inputValue: document.getElementById('ticketPnrInputFB').value,
        submitted: window.__order_submitted_fb
      })
    `) as any;

    console.log('Kết quả điền form từ URL (4B):', orderFormVals4B);

    if (orderFormVals4B.inputValue !== 'MOCKPNR123') {
      throw new Error('Số vé/PNR chưa được điền chính xác từ URL, mong đợi "MOCKPNR123" (PNR), thực tế: ' + orderFormVals4B.inputValue);
    }
    if (!orderFormVals4B.submitted) {
      throw new Error('Form SearchAllOrder chưa được tự động submit từ URL!');
    }
    console.log('Xác minh luồng truyền tham số tự động trên SearchAllOrder (Fallback) thành công!');

    console.log('\n=========================================');
    console.log('XÁC MINH HOÀN TẤT THÀNH CÔNG!');
    console.log('=========================================');;



  } catch (err) {
    console.error('Lỗi kiểm thử: ', err);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Đã đóng trình duyệt.');
  }
}

main().catch(console.error);
