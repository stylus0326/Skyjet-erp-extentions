import { ExtensionFile } from '../types';

export const backgroundFile: ExtensionFile = {
  name: 'background.js',
  path: 'background.js',
  language: 'javascript',
  description: 'Script chạy nền (Service Worker) tiếp nhận yêu cầu gửi request POST/GET chạy ngầm để lấy dữ liệu chặng bay hoặc chi tiết đơn hàng không gây tải lại trang.',
  content: `/**
 * Skyjet ERP Helper - Background Service Worker
 */

function isValidField(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (s === '') return false;
  const lower = s.toLowerCase();
  if (lower === '0' || lower === 'empty' || lower === 'null' || lower === 'undefined') return false;
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'check_flightvn_login') {
    const handleCheckLogin = async () => {
      let ruleApplied = false;
      try {
        const cookieMap = new Map();
        try {
          const cookiesAll = await chrome.cookies.getAll({ domain: 'flightvn.com' });
          if (cookiesAll && cookiesAll.length > 0) {
            cookiesAll.forEach(c => cookieMap.set(c.name, c.value));
          }
        } catch (e) {
          console.warn('[FlightVN] Lỗi lấy cookie:', e);
        }
        try {
          const cookiesPart = await chrome.cookies.getAll({ domain: 'flightvn.com', partitionKey: {} });
          if (cookiesPart && cookiesPart.length > 0) {
            cookiesPart.forEach(c => cookieMap.set(c.name, c.value));
          }
        } catch (e) {
          console.warn('[FlightVN] Lỗi lấy cookie partitioned:', e);
        }

        if (cookieMap.size > 0) {
          const rawCookieString = Array.from(cookieMap.entries()).map(([name, value]) => name + '=' + value).join('; ');
          await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [999],
            addRules: [{
              id: 999,
              priority: 1,
              action: {
                type: 'modifyHeaders',
                requestHeaders: [{
                  header: 'Cookie',
                  operation: 'set',
                  value: rawCookieString
                }]
              },
              condition: {
                urlFilter: 'flightvn.com/Booking/ImportBooking',
                resourceTypes: ['xmlhttprequest', 'other']
              }
            }]
          });
          ruleApplied = true;
        }
      } catch (cookieErr) {
        console.error('[FlightVN] Lỗi lấy cookie hoặc áp dụng netRequest rule:', cookieErr);
      }

      let response;
      try {
        response = await fetch('https://flightvn.com/Booking/ImportBooking', {
          method: 'GET',
          credentials: 'include'
        });
      } catch (fetchErr) {
        console.error('[FlightVN] Lỗi fetch check login:', fetchErr);
        return { success: false, error: 'Không thể kết nối đến FlightVN' };
      } finally {
        if (ruleApplied) {
          try {
            await chrome.declarativeNetRequest.updateSessionRules({
              removeRuleIds: [999]
            });
          } catch (clearErr) {
            console.error('[FlightVN] Lỗi khi gỡ rule declarativeNetRequest:', clearErr);
          }
        }
      }

      if (!response.ok) {
        return { success: false, error: \`Lỗi kết nối FlightVN: \${response.status}\` };
      }

      if (response.url && (response.url.toLowerCase().includes('/login') || response.url.toLowerCase().includes('/account/') || response.url.includes('urlReturn='))) {
        return { success: false, error: 'Chưa đăng nhập FlightVN' };
      }

      const html = await response.text();
      const titleMatch = html.match(/<title>([\\s\\S]*?)<\\/title>/i);
      if (titleMatch && (titleMatch[1].trim().toLowerCase() === 'đăng nhập' || titleMatch[1].trim().toLowerCase() === 'login')) {
        return { success: false, error: 'Chưa đăng nhập FlightVN' };
      }

      return { success: true };
    };

    handleCheckLogin().then(res => sendResponse(res));
    return true; // Giữ kết nối bất đồng bộ
  }

  if (message.action === 'capture_tab_rect') {
    // Determine target window: try sender tab first, fallback to active tab in lastFocusedWindow or currentWindow
    let windowId = undefined;
    if (sender && sender.tab && typeof sender.tab.windowId === 'number') {
      windowId = sender.tab.windowId;
    }
    
    const performCapture = (winId) => {
      chrome.tabs.captureVisibleTab(winId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          const firstErr = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
          console.error('Lỗi captureVisibleTab (lần 1): ', firstErr);
          
          // Fallback to active tab of last focused window
          chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            let lastFocusedWinId = undefined;
            if (tabs && tabs[0]) {
              lastFocusedWinId = tabs[0].windowId;
            }
            chrome.tabs.captureVisibleTab(lastFocusedWinId, { format: 'png' }, (dataUrlFallback) => {
              if (chrome.runtime.lastError) {
                const secondErr = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
                console.error('Lỗi captureVisibleTab (lần 2): ', secondErr);
                
                // Final fallback: try current window context active tab
                chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
                  let currentWinId = undefined;
                  if (currentTabs && currentTabs[0]) {
                    currentWinId = currentTabs[0].windowId;
                  }
                  chrome.tabs.captureVisibleTab(currentWinId, { format: 'png' }, (dataUrlFinal) => {
                    if (chrome.runtime.lastError) {
                      const finalErr = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
                      console.error('Lỗi captureVisibleTab (cuối cùng): ', finalErr);
                      sendResponse({ success: false, error: \`Capture failed: \${firstErr} -> \${secondErr} -> \${finalErr}\` });
                    } else {
                      sendResponse({ success: true, dataUrl: dataUrlFinal });
                    }
                  });
                });
              } else {
                sendResponse({ success: true, dataUrl: dataUrlFallback });
              }
            });
          });
        } else {
          sendResponse({ success: true, dataUrl: dataUrl });
        }
      });
    };

    performCapture(windowId);
    return true; // Giữ kết nối để phản hồi bất đồng bộ
  }

  if (message.action === 'refresh_skyjet_config') {
    const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';
    const handleRefresh = async () => {
      try {
        const headers = {
          'apikey': SUPABASE_KEY,
          'Authorization': \`Bearer \${SUPABASE_KEY}\`
        };
        const [campRes, detRes, blkRes, polRes, thRes, airRes] = await Promise.all([
          fetch(\`\${SUPABASE_URL}/rest/v1/campaign?select=*\`, { headers }),
          fetch(\`\${SUPABASE_URL}/rest/v1/campaign_details?select=*\`, { headers }),
          fetch(\`\${SUPABASE_URL}/rest/v1/campaign_blackout_periods?select=*\`, { headers }),
          fetch(\`\${SUPABASE_URL}/rest/v1/policies?select=*\`, { headers }),
          fetch(\`\${SUPABASE_URL}/rest/v1/thresholds?select=*\`, { headers }),
          fetch(\`\${SUPABASE_URL}/rest/v1/airports?select=*\`, { headers })
        ]);
        
        if (!campRes.ok || !detRes.ok || !blkRes.ok || !polRes.ok || !thRes.ok || !airRes.ok) {
          throw new Error('Failed to fetch config from Supabase');
        }

        const [camp, det, blk, pol, th, air] = await Promise.all([
          campRes.json(),
          detRes.json(),
          blkRes.json(),
          polRes.json(),
          thRes.json(),
          airRes.json()
        ]);

        await chrome.storage.local.set({
          skyjet_campaign: camp,
          skyjet_campaign_details: det,
          skyjet_campaign_blackout_periods: blk,
          skyjet_policies: pol,
          skyjet_thresholds: th,
          skyjet_airports: air
        });
        console.log('[Skyjet Config] Refreshed successfully in background');
        sendResponse({ success: true });
      } catch (err) {
        console.error('[Skyjet Config] Error refreshing:', err);
        sendResponse({ success: false, error: err.message });
      }
    };
    handleRefresh();
    return true;
  }

  if (message.action === 'check_ticket_cache') {
    const { ticketNumbers, pnrCodes } = message;
    const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

    const handleCheck = async () => {
      const tickets = (ticketNumbers || []).filter(Boolean);
      const pnrs = (pnrCodes || []).map(p => p ? p.split('*')[0].trim() : '').filter(Boolean);

      if (!SUPABASE_KEY || (tickets.length === 0 && pnrs.length === 0)) {
        sendResponse({ success: true, data: [] });
        return;
      }
      try {
        console.log(\`[Supabase] Đang kiểm tra cache cho danh sách vé:\`, tickets, \`và PNR:\`, pnrs);
        let queryParams = '';
        if (tickets.length > 0 && pnrs.length > 0) {
          const encodedTickets = tickets.map(n => '%22' + n + '%22').join(',');
          const encodedPnrs = pnrs.map(p => '%22' + p + '%22').join(',');
          queryParams = \`or=(ticket_number.in.(\${encodedTickets}),pnr_code.in.(\${encodedPnrs}))\`;
        } else if (tickets.length > 0) {
          const encodedTickets = tickets.map(n => '%22' + n + '%22').join(',');
          queryParams = \`ticket_number=in.(\${encodedTickets})\`;
        } else {
          const encodedPnrs = pnrs.map(p => '%22' + p + '%22').join(',');
          queryParams = \`pnr_code=in.(\${encodedPnrs})\`;
        }

        const cacheRes = await fetch(\`\${SUPABASE_URL}/rest/v1/vna_ticket_cache?\${queryParams}&select=*\`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': \`Bearer \${SUPABASE_KEY}\`
          }
        });
        if (cacheRes.ok) {
          const cacheList = await cacheRes.json();
          sendResponse({ success: true, data: cacheList });
        } else {
          console.warn('[Supabase] Không thể đọc cache vé:', cacheRes.statusText);
          sendResponse({ success: false, error: cacheRes.statusText });
        }
      } catch (e) {
        console.error('[Supabase] Lỗi khi kết nối cache vé:', e);
        sendResponse({ success: false, error: e.message });
      }
    };
    handleCheck();
    return true;
  }

  if (message.action === 'save_ticket_cache') {
    const { tickets } = message;
    const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

    const handleSave = async () => {
      if (!SUPABASE_KEY || !tickets || tickets.length === 0) {
        sendResponse({ success: true });
        return;
      }
      try {
        console.log(\`[Supabase] Đang lọc và lưu cache cho \${tickets.length} vé...\`);
        const validTickets = tickets.filter(t => 
          isValidField(t.ticket_number) &&
          !/[^a-zA-Z0-9]/.test(t.ticket_number.trim()) &&
          isValidField(t.pnr_code) &&
          isValidField(t.ticket_class)
        );

        if (validTickets.length === 0) {
          console.log('[Supabase] Không có vé hợp lệ nào để lưu (thiếu hoặc sai định dạng trường bắt buộc).');
          sendResponse({ success: true });
          return;
        }

        const ticketNumbers = validTickets.map(t => t.ticket_number);
        let existingMap = {};
        if (ticketNumbers.length > 0) {
          try {
            const existRes = await fetch(\`\${SUPABASE_URL}/rest/v1/vna_ticket_cache?ticket_number=in.(\${ticketNumbers.map(n => \`%22\${n}%22\`).join(',')})\`, {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': \`Bearer \${SUPABASE_KEY}\`
              }
            });
            if (existRes.ok) {
              const list = await existRes.json();
              list.forEach(item => {
                existingMap[item.ticket_number] = item;
              });
            }
          } catch (existErr) {
            console.warn('[Supabase] Lỗi khi đọc cache cũ in save_ticket_cache:', existErr);
          }
        }

        console.log(\`[Supabase] Đang lưu cache cho \${validTickets.length} vé hợp lệ...\`);
        const payload = validTickets.map(t => {
          const existing = existingMap[t.ticket_number] || {};
          return {
            ticket_number: t.ticket_number,
            pnr_code: t.pnr_code ? t.pnr_code.split('*')[0].trim() : t.pnr_code,
            ticket_class: t.ticket_class,
            carrier: t.carrier !== undefined ? t.carrier : null,
            fare: t.fare !== undefined ? t.fare : null,
            channel: (t.channel !== undefined && t.channel !== null && String(t.channel).trim() !== '' && String(t.channel).toUpperCase() !== 'EMPTY' && String(t.channel).toUpperCase() !== 'NULL') ? String(t.channel).trim() : 'Partner',
            AGCODE: t.AGCODE !== undefined ? t.AGCODE : null,
            DATECOM: t.DATECOM !== undefined ? t.DATECOM : null,
            flight: existing.flight === true ? true : null,
            updated_at: new Date().toISOString()
          };
        });
        const response = await fetch(\`\${SUPABASE_URL}/rest/v1/vna_ticket_cache\`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': \`Bearer \${SUPABASE_KEY}\`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          console.log(\`[Supabase] Đã lưu cache vé thành công.\`);
          sendResponse({ success: true });
        } else {
          const errMsg = await response.text();
          console.error('[Supabase] Ghi cache vé thất bại:', errMsg);
          sendResponse({ success: false, error: errMsg });
        }
      } catch (e) {
        console.error('[Supabase] Lỗi khi ghi cache vé:', e);
        sendResponse({ success: false, error: e.message });
      }
    };
    handleSave();
    return true;
  }
  
  if (message.action === 'open_flightvn_login') {
    chrome.tabs.create({ url: 'https://flightvn.com/Booking/ImportBooking' });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'fetch_vietnamairlines') {
    let { pnr, lastName, passengerName, airlineId, hasAsterisk, ticketNumbers: msgTicketNumbers, agCode, dateCom } = message;
    if (pnr) {
      pnr = pnr.split('*')[0].trim();
    }
    
    const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO'; 

    const handleFetch = async () => {
      // 1. Kiểm tra trong Supabase Cache trước
      if (SUPABASE_KEY) {
        try {
          console.log(\`[Supabase] Đang tìm kiếm cache cho PNR \${pnr}...\`);
          const cacheRes = await fetch(\`\${SUPABASE_URL}/rest/v1/vna_ticket_cache?pnr_code=eq.\${pnr}&flight=eq.true&select=json_data,carrier,ticket_class,fare,flight&limit=1\`, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': \`Bearer \${SUPABASE_KEY}\`
            }
          });
          if (cacheRes.ok) {
            const cacheList = await cacheRes.json();
            if (cacheList && cacheList.length > 0) {
              console.log(\`[Supabase] Tìm thấy PNR \${pnr} trong cache!\`);
              let segments = cacheList[0].json_data;
              if (typeof segments === 'string') {
                try {
                  segments = JSON.parse(segments);
                } catch (e) {
                  console.error('Error parsing json_data:', e);
                }
              }
              const reconstructedData = {
                reservation: {
                  originDestinationOptions: segments && segments.length > 0 ? [{ flightSegments: segments }] : [],
                  passengers: []
                }
              };
              sendResponse({
                success: true,
                source: 'cache',
                data: reconstructedData,
                ticket_class: cacheList[0].ticket_class || null,
                fare: cacheList[0].fare || null
              });
              return;
            }
          } else {
            console.warn('[Supabase] Không thể đọc cache:', cacheRes.statusText);
          }
        } catch (e) {
          console.error('[Supabase] Lỗi khi kết nối cache:', e);
        }
      }

      if (airlineId !== 'VNA' && airlineId !== 'SPA' && airlineId !== 'VIETJET' && airlineId !== 'BAMBOO' && airlineId !== 'VIETRAVEL') {
        console.log(\`[FlightVN] Hãng \${airlineId} không hỗ trợ tra cứu trực tiếp trên FlightVN. Bỏ qua.\`);
        sendResponse({ success: true, data: { reservation: { originDestinationOptions: [], passengers: [] } } });
        return;
      }

      // 3. Nếu không có cache và hãng được hỗ trợ, thực hiện POST lên FlightVN để lấy HTML
      let ruleApplied = false;
      try {
        console.log(\`[FlightVN] Đang gửi POST request tra cứu PNR \${pnr} (Hãng \${airlineId})...\`);
        const formData = new FormData();
        formData.append('RecordLocation', pnr);
        formData.append('AirlineId', airlineId);
        formData.append('AirlineSpecified', 'True');
        formData.append('btnSearchBooking', 'Tra cứu');

        try {
          const cookieMap = new Map();
          const domains = ['flightvn.com', '.flightvn.com'];
          const urls = [
            'https://flightvn.com',
            'https://www.flightvn.com',
            'http://flightvn.com',
            'http://www.flightvn.com'
          ];
          
          // 1. Get cookies by URL
          for (const url of urls) {
            try {
              const cookies = await chrome.cookies.getAll({ url });
              if (cookies && cookies.length > 0) {
                cookies.forEach(c => cookieMap.set(c.name, c.value));
              }
            } catch (e) {
              console.error('[FlightVN] Lỗi lấy cookie theo URL: ' + url, e);
            }
          }
          
          // 2. Get cookies by Domain
          for (const domain of domains) {
            try {
              const cookies = await chrome.cookies.getAll({ domain });
              if (cookies && cookies.length > 0) {
                cookies.forEach(c => cookieMap.set(c.name, c.value));
              }
            } catch (e) {
              console.error('[FlightVN] Lỗi lấy cookie theo Domain: ' + domain, e);
            }
          }

          // 3. Get partitioned cookies (with partitionKey: {})
          try {
            const cookiesPart = await chrome.cookies.getAll({ domain: 'flightvn.com', partitionKey: {} });
            if (cookiesPart && cookiesPart.length > 0) {
              cookiesPart.forEach(c => cookieMap.set(c.name, c.value));
            }
          } catch (e) {
            console.warn('[FlightVN] Không hỗ trợ partitionKey hoặc lỗi lấy cookie partitioned:', e);
          }

          if (cookieMap.size > 0) {
            const rawCookieString = Array.from(cookieMap.entries()).map(([name, value]) => name + '=' + value).join('; ');
            await chrome.declarativeNetRequest.updateSessionRules({
              removeRuleIds: [999],
              addRules: [{
                id: 999,
                priority: 1,
                action: {
                  type: 'modifyHeaders',
                  requestHeaders: [{
                    header: 'Cookie',
                    operation: 'set',
                    value: rawCookieString
                  }]
                },
                condition: {
                  urlFilter: 'flightvn.com/Booking/ImportBooking',
                  resourceTypes: ['xmlhttprequest', 'other']
                }
              }]
            });
            ruleApplied = true;
            console.log('[FlightVN] Đã áp dụng cấu hình Cookie động qua declarativeNetRequest. Số lượng: ' + cookieMap.size);
          } else {
            console.warn('[FlightVN] Không tìm thấy cookie nào cho flightvn.com.');
          }
        } catch (cookieErr) {
          console.error('[FlightVN] Lỗi lấy cookie hoặc áp dụng netRequest rule:', cookieErr);
        }

        let response;
        try {
          response = await fetch(\`https://flightvn.com/Booking/ImportBooking/?airlineId=\${airlineId}\`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
        } finally {
          if (ruleApplied) {
            try {
              await chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: [999]
              });
              console.log('[FlightVN] Đã gỡ bỏ cấu hình Cookie động.');
            } catch (clearErr) {
              console.error('[FlightVN] Lỗi khi gỡ rule declarativeNetRequest:', clearErr);
            }
          }
        }

        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }

        if (response.url && (response.url.toLowerCase().includes('/login') || response.url.toLowerCase().includes('/account/') || response.url.includes('urlReturn='))) {
          sendResponse({ success: false, error: 'Chưa đăng nhập FlightVN' });
          return;
        }

        const html = await response.text();
        const titleMatch = html.match(/<title>([\\s\\S]*?)<\\/title>/i);
        if (titleMatch && (titleMatch[1].trim().toLowerCase() === 'đăng nhập' || titleMatch[1].trim().toLowerCase() === 'login')) {
          sendResponse({ success: false, error: 'Chưa đăng nhập FlightVN' });
          return;
        }
        
        // 3. Parser HTML dùng Regex vì Service Worker không hỗ trợ DOMParser
        function cleanHtmlText(text) {
          return text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&#(\\d+);/g, (match, dec) => String.fromCharCode(dec))
            .replace(/\\s+/g, ' ')
            .trim();
        }


        function parseFlightVnHtml(htmlText) {
          const tables = [];
          const tableRegex = /<table[^>]*>([\\s\\S]*?)<\\/table>/gi;
          let match;
          while ((match = tableRegex.exec(htmlText)) !== null) {
            const tableContent = match[1];
            const rows = [];
            const trRegex = /<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi;
            let trMatch;
            while ((trMatch = trRegex.exec(tableContent)) !== null) {
              const rowContent = trMatch[1];
              const cells = [];
              const cellRegex = /<(td|th)[^>]*>([\\s\\S]*?)<\\/\\1>/gi;
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

        const tables = parseFlightVnHtml(html);
        console.log('[Skyjet Debug] All parsed HTML tables:', JSON.stringify(tables, null, 2));
        
        // Mapping dữ liệu dynamically based on header keywords
        let segmentsTable = [];
        let passengersTable = [];
        let ticketsTable = [];

        for (const table of tables) {
          if (!table || table.length === 0) continue;
          const firstRowStr = JSON.stringify(table[0]).toLowerCase();
          
          if (firstRowStr.indexOf('mã chuyến') !== -1 || firstRowStr.indexOf('ngày bay') !== -1 || firstRowStr.indexOf('chuyến bay') !== -1 || firstRowStr.indexOf('chặng bay') !== -1) {
            segmentsTable = table;
          } else if (firstRowStr.indexOf('số vé') !== -1 || firstRowStr.indexOf('mã vé') !== -1) {
            ticketsTable = table;
          } else if (firstRowStr.indexOf('họ tên') !== -1 || firstRowStr.indexOf('tên khách') !== -1 || firstRowStr.indexOf('hành khách') !== -1 || firstRowStr.indexOf('tên hành khách') !== -1) {
            passengersTable = table;
          }
        }

        // Fallback to legacy index-based assignment if empty
        if (segmentsTable.length === 0) segmentsTable = tables[0] || [];
        if (passengersTable.length === 0) passengersTable = tables[1] || [];
        if (ticketsTable.length === 0) ticketsTable = tables[2] || [];

        let data = {
          reservation: {
            originDestinationOptions: [],
            passengers: []
          }
        };

        let parsedTicketClass = '';
        let parsedFare = null;
        const ticketFareMap = {};
        const flightSegments = [];
        const passengers = [];
        const segmentClassesList = [];

        if (segmentsTable.length > 1 || passengersTable.length > 1) {
          const isSPA = (airlineId === 'SPA');
          for (let i = 1; i < segmentsTable.length; i++) {
            const row = segmentsTable[i];
            if (isSPA) {
              if (row.length < 3) continue;
            } else {
              if (row.length < 7) continue;
            }
            
            let segmentClass = '';
            if (segmentsTable[0]) {
              const classHeaderIdx = segmentsTable[0].findIndex(h => {
                const lower = h.toLowerCase();
                return lower.includes('hạng') || lower.includes('hang') || lower.includes('lớp') || lower.includes('lop') || lower.includes('class');
              });
              if (classHeaderIdx !== -1 && row[classHeaderIdx]) {
                segmentClass = row[classHeaderIdx].trim();
              } else if (row.length >= 7 && row[6]) {
                segmentClass = row[6].trim();
              }
            } else if (row.length >= 7 && row[6]) {
              segmentClass = row[6].trim();
            }
            if (segmentClass) {
              segmentClassesList.push(segmentClass.toUpperCase().trim());
            }

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
              const timeVal = timeStr || '00:00';
              departureDateTime = \`\${year}-\${month}-\${day}T\${timeVal}:00\`;
            }

            flightSegments.push({
              marketingAirlineCode,
              flightNumber,
              departureLocationCode: from,
              arrivalLocationCode: to,
              departureDateTime
            });
          }

          if (segmentClassesList.length > 0) {
            parsedTicketClass = segmentClassesList.join('-');
          }

          data.reservation.originDestinationOptions = flightSegments.length > 0 ? [{ flightSegments }] : [];

          const ticketMap = {};
          let priceColIdx = 4;
          if (ticketsTable.length > 0 && ticketsTable[0]) {
            const idx = ticketsTable[0].findIndex(h => {
              const lower = h.toLowerCase().trim();
              return lower === 'giá' || lower === 'gia' || lower === 'tổng giá vé' || lower === 'tong gia ve' || lower === 'fare' || lower === 'price';
            });
            if (idx !== -1) {
              priceColIdx = idx;
            }
          }

          for (let i = 1; i < ticketsTable.length; i++) {
            const row = ticketsTable[i];
            if (row.length >= 3) {
              const ticketNum = row[1] ? row[1].trim() : '';
              const passengerNameStr = (row[2] || '').toUpperCase().trim();
              if (ticketNum && passengerNameStr) {
                ticketMap[passengerNameStr] = ticketNum;
              }
              if (ticketNum && row.length > priceColIdx) {
                const rawPrice = row[priceColIdx] ? row[priceColIdx].replace(/[^0-9]/g, '') : '';
                if (rawPrice) {
                  ticketFareMap[ticketNum] = parseFloat(rawPrice);
                }
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
          data.reservation.passengers = passengers;
        } else {
          // Fallback to parsing raw text from #TicketFace textarea
          const ticketFaceMatch = html.match(/<textarea[^>]*id="TicketFace"[^>]*>([\\s\\S]*?)<\\/textarea>/i);
          if (ticketFaceMatch) {
            const ticketFaceText = ticketFaceMatch[1];
            const months = {
              JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
              JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
            };

            const lines = ticketFaceText.split('\\n');
            const ticketMap = {};
            const segmentClassesList = [];

            const segRegex = /^\\s*\\d+\\s+([A-Z0-9]{2})\\s*([0-9]+)\\s+([A-Z])\\s+(\\d{1,2})([A-Z]{3})\\s+([A-Z]{3})([A-Z]{3})\\s+([A-Z]{2})\\s*([0-9]{4})/i;
            const paxRegex = /^\\s*\\d+\\.?\\d*([A-Z]+)\\/([A-Z\\s]+)\\s+([A-Z]+)/i;
            const tktRegex = /TE\\s+([0-9]{10,15})\\s+([A-Z0-9\\/\\s]+)/i;

            lines.forEach(line => {
              const segMatch = line.match(segRegex);
              if (segMatch) {
                const marketingAirlineCode = segMatch[1].toUpperCase();
                const flightNumber = segMatch[2];
                if (segMatch[3]) {
                  segmentClassesList.push(segMatch[3].toUpperCase().trim());
                }
                const day = segMatch[4].padStart(2, '0');
                const monthStr = segMatch[5].toUpperCase();
                const monthNum = months[monthStr] || '01';
                const from = segMatch[6].toUpperCase();
                const to = segMatch[7].toUpperCase();
                const timeRaw = segMatch[9];
                const hour = timeRaw.substring(0, 2);
                const min = timeRaw.substring(2, 4);

                let year = new Date().getFullYear();
                const currentMonth = new Date().getMonth() + 1;
                if (parseInt(monthNum) < currentMonth && (currentMonth - parseInt(monthNum)) > 6) {
                  year += 1;
                }
                const departureDateTime = \`\${year}-\${monthNum}-\${day}T\${hour}:\${min}:00\`;

                flightSegments.push({
                  marketingAirlineCode,
                  flightNumber,
                  departureLocationCode: from,
                  arrivalLocationCode: to,
                  departureDateTime
                });
              }

              const paxMatch = line.match(paxRegex);
              if (paxMatch) {
                const lastName = paxMatch[1].toUpperCase().trim();
                const firstName = paxMatch[2].toUpperCase().trim().replace(/\\s+/g, ' ');
                const title = paxMatch[3].toUpperCase().trim();
                const fullName = \`\${lastName} \${firstName}\`;
                passengers.push({
                  fullName,
                  title,
                  ticketNumber: ''
                });
              }

              const tktMatch = line.match(tktRegex);
              if (tktMatch) {
                const ticketNum = tktMatch[1];
                const rawName = tktMatch[2].toUpperCase().trim();
                const cleanName = rawName.replace(/\\//g, ' ').replace(/\\s+/g, ' ');
                 ticketMap[cleanName] = ticketNum;
              }
            });

            if (segmentClassesList.length > 0) {
              parsedTicketClass = segmentClassesList.join('-');
            }

            passengers.forEach(p => {
              if (ticketMap[p.fullName]) {
                p.ticketNumber = ticketMap[p.fullName];
              } else {
                for (const name in ticketMap) {
                  if (name.includes(p.fullName) || p.fullName.includes(name)) {
                    p.ticketNumber = ticketMap[name];
                    break;
                  }
                }
              }
            });

            data.reservation.originDestinationOptions = flightSegments.length > 0 ? [{ flightSegments }] : [];
            data.reservation.passengers = passengers;
          }
        }

        // Extract values to cache
        let carrier = 'VN';
        if (airlineId === 'VIETJET') carrier = 'VJ';
        else if (airlineId === 'BAMBOO') carrier = 'QH';
        else if (airlineId === 'VIETRAVEL') carrier = 'VU';
        else if (airlineId === 'SPA') carrier = '9G';
        else if (airlineId === 'VNA') carrier = 'VN';

        if (flightSegments.length > 0 && flightSegments[0].marketingAirlineCode) {
          carrier = flightSegments[0].marketingAirlineCode;
        }

        // 4. Lưu vào Supabase cache (vna_ticket_cache)
        let supabaseStatus = 'Not executed';
        if (SUPABASE_KEY) {
          const passengersToSave = passengers.length > 0 ? passengers : [{ fullName: 'UNKNOWN', title: '', ticketNumber: '' }];
          
          const ticketNumbers = [];
          if (msgTicketNumbers && Array.isArray(msgTicketNumbers)) {
            msgTicketNumbers.forEach(n => {
              if (n) ticketNumbers.push(n);
            });
          }
          passengersToSave.forEach(p => {
            let tkt = p.ticketNumber;
            if (!tkt) {
              const prefixMap = {
                'VJ': 'VJA',
                'VN': 'VNA',
                '9G': 'SPA',
                'QH': 'QH',
                'VU': 'VU'
              };
              const prefix = prefixMap[carrier] || carrier || 'VNA';
              tkt = prefix + pnr;
            }
            if (tkt) ticketNumbers.push(tkt);
          });

          let existingMap = {};
          try {
            let filter = \`pnr_code=eq.\${pnr}\`;
            if (ticketNumbers.length > 0) {
              filter = \`or=(pnr_code.eq.\${pnr},ticket_number.in.(\${ticketNumbers.map(n => \`%22\${n}%22\`).join(',')}))\`;
            }
            const existRes = await fetch(\`\${SUPABASE_URL}/rest/v1/vna_ticket_cache?\${filter}\`, {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': \`Bearer \${SUPABASE_KEY}\`
              }
            });
            if (existRes.ok) {
              const list = await existRes.json();
              list.forEach(item => {
                existingMap[item.ticket_number] = item;
              });
            }
          } catch (existErr) {
            console.warn('[Supabase] Lỗi khi đọc cache cũ trước khi lưu PNR:', existErr);
            supabaseStatus = \`Error reading existing cache: \${existErr.message}\`;
          }

          const payloadMap = {};

          // Khởi tạo trước tất cả các vé đã có trong database của PNR này với flight: true
          Object.keys(existingMap).forEach(tkt => {
            const existing = existingMap[tkt];
            payloadMap[tkt] = {
              ticket_number: tkt,
              pnr_code: pnr,
              json_data: flightSegments.length > 0 ? flightSegments : (existing.json_data || []),
              carrier: carrier || existing.carrier || null,
              ticket_class: existing.ticket_class || null,
              fare: existing.fare || null,
              channel: (existing.channel !== undefined && existing.channel !== null && String(existing.channel).trim() !== '' && String(existing.channel).toUpperCase() !== 'EMPTY' && String(existing.channel).toUpperCase() !== 'NULL') ? String(existing.channel).trim() : 'Partner',
              AGCODE: existing.AGCODE || agCode || 'SJNTRH',
              DATECOM: dateCom || existing.DATECOM || null,
              flight: true,
              updated_at: new Date().toISOString()
            };
          });

          // Thêm cả các vé từ ticketNumbers (bao gồm vé từ frontend) để đảm bảo chúng có flight: true
          ticketNumbers.forEach(tkt => {
            if (!tkt) return;
            const existing = existingMap[tkt] || {};
            payloadMap[tkt] = {
              ticket_number: tkt,
              pnr_code: pnr,
              json_data: flightSegments.length > 0 ? flightSegments : (existing.json_data || []),
              carrier: carrier || existing.carrier || null,
              ticket_class: existing.ticket_class || null,
              fare: existing.fare || null,
              channel: (existing.channel !== undefined && existing.channel !== null && String(existing.channel).trim() !== '' && String(existing.channel).toUpperCase() !== 'EMPTY' && String(existing.channel).toUpperCase() !== 'NULL') ? String(existing.channel).trim() : 'Partner',
              AGCODE: existing.AGCODE || agCode || 'SJNTRH',
              DATECOM: dateCom || existing.DATECOM || null,
              flight: true,
              updated_at: new Date().toISOString()
            };
          });

          // Ghi đè hoặc thêm thông tin hành khách vừa parse được
          passengersToSave.forEach(p => {
            let tkt = p.ticketNumber;
            if (!tkt) {
              const prefixMap = {
                'VJ': 'VJA',
                'VN': 'VNA',
                '9G': 'SPA',
                'QH': 'QH',
                'VU': 'VU'
              };
              const prefix = prefixMap[carrier] || carrier || 'VNA';
              tkt = prefix + pnr;
            }
            const existing = existingMap[tkt] || {};
            let ticketClassToSave = null;
            if (parsedTicketClass) {
              ticketClassToSave = parsedTicketClass;
            } else if (existing.ticket_class !== undefined) {
              ticketClassToSave = existing.ticket_class;
            }
            let fareToSave = null;
            if (existing.fare !== undefined && existing.fare !== null) {
              fareToSave = existing.fare;
            } else if (p.ticketNumber && ticketFareMap[p.ticketNumber] !== undefined) {
              fareToSave = ticketFareMap[p.ticketNumber];
            } else if (parsedFare !== null) {
              fareToSave = parsedFare;
            }
            payloadMap[tkt] = {
              ticket_number: tkt,
              pnr_code: pnr,
              json_data: flightSegments,
              carrier: carrier || existing.carrier || null,
              ticket_class: ticketClassToSave,
              fare: fareToSave,
              channel: (existing.channel !== undefined && existing.channel !== null && String(existing.channel).trim() !== '' && String(existing.channel).toUpperCase() !== 'EMPTY' && String(existing.channel).toUpperCase() !== 'NULL') ? String(existing.channel).trim() : 'Partner',
              AGCODE: existing.AGCODE || agCode || 'SJNTRH',
              DATECOM: dateCom || existing.DATECOM || null,
              flight: true,
              updated_at: new Date().toISOString()
            };
          });
          const payload = Object.values(payloadMap).filter((t) => {
            return isValidField(t.ticket_number) && 
                   !/[^a-zA-Z0-9]/.test(t.ticket_number.trim()) &&
                   isValidField(t.pnr_code);
          });

          if (payload.length > 0) {
            try {
              console.log(\`[Supabase] Đang ghi cache cho PNR \${pnr} (\${payload.length} bản ghi)...\`);
              const saveRes = await fetch(\`\${SUPABASE_URL}/rest/v1/vna_ticket_cache\`, {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': \`Bearer \${SUPABASE_KEY}\`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(payload)
              });
              if (saveRes.ok) {
                console.log(\`[Supabase] Lưu thành công PNR \${pnr} vào cache.\`);
                supabaseStatus = \`Success: Saved \${payload.length} records\`;
              } else {
                const errText = await saveRes.text();
                console.error('[Supabase] Ghi cache PNR thất bại:', errText);
                supabaseStatus = \`Failed to save: \${errText}\`;
              }
            } catch (saveErr) {
              console.error('[Supabase] Lỗi khi lưu cache PNR:', saveErr);
              supabaseStatus = \`Exception saving: \${saveErr.message}\`;
            }
          } else {
            supabaseStatus = 'No valid records to save in payload';
          }
        }

        const ticket_type = (hasAsterisk && parsedTicketClass) ? 'Vé bán' : null;
        const ticket_class = parsedTicketClass || null;
        const farePerTicket = parsedFare !== null ? parsedFare : null;
        sendResponse({ success: true, source: 'flightvn', data, ticket_type, ticket_class, fare: farePerTicket, ticketFareMap: ticketFareMap, supabaseStatus });
      } catch (err) {
        console.error('Lỗi khi tra cứu FlightVN PNR ' + pnr + ':', err);
        sendResponse({ success: false, error: err.message, supabaseStatus: \`Exception: \${err.message}\` });
      }
    };

    handleFetch();
    return true; // Giữ kết nối bất đồng bộ
  }
});`
};
