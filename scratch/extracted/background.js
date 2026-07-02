/**
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
  if (message.action === 'capture_tab_rect') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Lỗi captureVisibleTab: ', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true; // Giữ kết nối để phản hồi bất đồng bộ
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
        console.log(`[Supabase] Đang kiểm tra cache cho danh sách vé:`, tickets, `và PNR:`, pnrs);
        let queryParams = '';
        if (tickets.length > 0 && pnrs.length > 0) {
          const encodedTickets = tickets.map(n => '%22' + n + '%22').join(',');
          const encodedPnrs = pnrs.map(p => '%22' + p + '%22').join(',');
          queryParams = `or=(ticket_number.in.(${encodedTickets}),pnr_code.in.(${encodedPnrs}))`;
        } else if (tickets.length > 0) {
          const encodedTickets = tickets.map(n => '%22' + n + '%22').join(',');
          queryParams = `ticket_number=in.(${encodedTickets})`;
        } else {
          const encodedPnrs = pnrs.map(p => '%22' + p + '%22').join(',');
          queryParams = `pnr_code=in.(${encodedPnrs})`;
        }

        const cacheRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?${queryParams}&select=*`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
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
        console.log(`[Supabase] Đang lọc và lưu cache cho ${tickets.length} vé...`);
        const validTickets = tickets.filter(t => 
          isValidField(t.ticket_number) &&
          isValidField(t.pnr_code) &&
          isValidField(t.ticket_type) &&
          isValidField(t.ticket_class)
        );

        if (validTickets.length === 0) {
          console.log('[Supabase] Không có vé hợp lệ nào để lưu (thiếu hoặc sai định dạng trường bắt buộc).');
          sendResponse({ success: true });
          return;
        }

        console.log(`[Supabase] Đang lưu cache cho ${validTickets.length} vé hợp lệ...`);
        const payload = validTickets.map(t => ({
          ticket_number: t.ticket_number,
          pnr_code: t.pnr_code ? t.pnr_code.split('*')[0].trim() : t.pnr_code,
          ticket_type: t.ticket_type,
          ticket_class: t.ticket_class,
          updated_at: new Date().toISOString()
        }));
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          console.log(`[Supabase] Đã lưu cache vé thành công.`);
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
    let { pnr, lastName, passengerName, airlineId, hasAsterisk } = message;
    if (pnr) {
      pnr = pnr.split('*')[0].trim();
    }
    
    const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO'; 

    const handleFetch = async () => {
      // 1. Kiểm tra trong Supabase Cache trước
      if (SUPABASE_KEY) {
        try {
          console.log(`[Supabase] Đang tìm kiếm cache cho PNR ${pnr}...`);
          const cacheRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?pnr_code=eq.${pnr}&json_data=not.is.null&select=json_data,carrier,ticket_type,ticket_class&limit=1`, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          });
          if (cacheRes.ok) {
            const cacheList = await cacheRes.json();
            if (cacheList && cacheList.length > 0) {
              console.log(`[Supabase] Tìm thấy PNR ${pnr} trong cache!`);
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
                ticket_type: cacheList[0].ticket_type || null,
                ticket_class: cacheList[0].ticket_class || null
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
        console.log(`[FlightVN] Hãng ${airlineId} không hỗ trợ tra cứu trực tiếp trên FlightVN. Bỏ qua.`);
        sendResponse({ success: true, data: { reservation: { originDestinationOptions: [], passengers: [] } } });
        return;
      }

      // 3. Nếu không có cache và hãng được hỗ trợ, thực hiện POST lên FlightVN để lấy HTML
      let ruleApplied = false;
      try {
        console.log(`[FlightVN] Đang gửi POST request tra cứu PNR ${pnr} (Hãng ${airlineId})...`);
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
          response = await fetch(`https://flightvn.com/Booking/ImportBooking/?airlineId=${airlineId}`, {
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
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (response.url && (response.url.toLowerCase().includes('/login') || response.url.toLowerCase().includes('/account/') || response.url.includes('urlReturn='))) {
          sendResponse({ success: false, error: 'Chưa đăng nhập FlightVN' });
          return;
        }

        const html = await response.text();
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
        if (titleMatch && (titleMatch[1].trim().toLowerCase() === 'đăng nhập' || titleMatch[1].trim().toLowerCase() === 'login')) {
          sendResponse({ success: false, error: 'Chưa đăng nhập FlightVN' });
          return;
        }
        
        // 3. Parser HTML dùng Regex vì Service Worker không hỗ trợ DOMParser
        function cleanHtmlText(text) {
          return text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
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

        const tables = parseFlightVnHtml(html);
        
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
        const flightSegments = [];
        const passengers = [];

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
            if (segmentClass && !parsedTicketClass) {
              parsedTicketClass = segmentClass;
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
              departureDateTime = `${year}-${month}-${day}T${timeVal}:00`;
            }

            flightSegments.push({
              marketingAirlineCode,
              flightNumber,
              departureLocationCode: from,
              arrivalLocationCode: to,
              departureDateTime
            });
          }

          data.reservation.originDestinationOptions = flightSegments.length > 0 ? [{ flightSegments }] : [];

          const ticketMap = {};
          for (let i = 1; i < ticketsTable.length; i++) {
            const row = ticketsTable[i];
            if (row.length >= 3) {
              const ticketNum = row[1];
              const passengerNameStr = (row[2] || '').toUpperCase().trim();
              if (ticketNum && passengerNameStr) {
                ticketMap[passengerNameStr] = ticketNum;
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
          const ticketFaceMatch = html.match(/<textarea[^>]*id="TicketFace"[^>]*>([\s\S]*?)<\/textarea>/i);
          if (ticketFaceMatch) {
            const ticketFaceText = ticketFaceMatch[1];
            const months = {
              JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
              JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
            };

            const lines = ticketFaceText.split('\n');
            const ticketMap = {};

            const segRegex = /^\s*\d+\s+([A-Z0-9]{2})\s*([0-9]+)\s+([A-Z])\s+(\d{1,2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+([A-Z]{2})\s*([0-9]{4})/i;
            const paxRegex = /^\s*\d+\.?\d*([A-Z]+)\/([A-Z\s]+)\s+([A-Z]+)/i;
            const tktRegex = /TE\s+([0-9]{10,15})\s+([A-Z0-9\/\s]+)/i;

            lines.forEach(line => {
              const segMatch = line.match(segRegex);
              if (segMatch) {
                const marketingAirlineCode = segMatch[1].toUpperCase();
                const flightNumber = segMatch[2];
                if (!parsedTicketClass && segMatch[3]) {
                  parsedTicketClass = segMatch[3].toUpperCase().trim();
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
                const departureDateTime = `${year}-${monthNum}-${day}T${hour}:${min}:00`;

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
                const firstName = paxMatch[2].toUpperCase().trim().replace(/\s+/g, ' ');
                const title = paxMatch[3].toUpperCase().trim();
                const fullName = `${lastName} ${firstName}`;
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
                const cleanName = rawName.replace(/\//g, ' ').replace(/\s+/g, ' ');
                ticketMap[cleanName] = ticketNum;
              }
            });

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
        if (SUPABASE_KEY && (flightSegments.length > 0 || passengers.length > 0)) {
          const passengersToSave = passengers.length > 0 ? passengers : [{ fullName: 'UNKNOWN', title: '', ticketNumber: '' }];
          
          // Lấy thông tin hiện có từ Supabase cache để merge tránh mất ticket_type, ticket_class
          const ticketNumbers = [];
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
          if (ticketNumbers.length > 0) {
            try {
              const existRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?ticket_number=in.(${ticketNumbers.map(n => `%22${n}%22`).join(',')})`, {
                method: 'GET',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`
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
            }
          }

          const payloadMap = {};
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
            let ticketTypeToSave = existing.ticket_type !== undefined ? existing.ticket_type : null;
            let ticketClassToSave = existing.ticket_class !== undefined ? existing.ticket_class : null;
            if (hasAsterisk && parsedTicketClass) {
              ticketTypeToSave = 'Vé bán';
              ticketClassToSave = parsedTicketClass;
            }
            payloadMap[tkt] = {
              ticket_number: tkt,
              pnr_code: pnr,
              json_data: flightSegments, // Store ONLY flightSegments array
              carrier: carrier,
              ticket_type: ticketTypeToSave,
              ticket_class: ticketClassToSave,
              updated_at: new Date().toISOString()
            };
          });
          const payload = Object.values(payloadMap).filter((t) => {
            const hasJsonData = t.json_data && Array.isArray(t.json_data) && t.json_data.length > 0;
            if (hasJsonData) {
              return isValidField(t.ticket_number) && isValidField(t.pnr_code);
            } else {
              return isValidField(t.ticket_number) &&
                     isValidField(t.pnr_code) &&
                     isValidField(t.ticket_type) &&
                     isValidField(t.ticket_class);
            }
          });

          if (payload.length > 0) {
            try {
              console.log(`[Supabase] Đang ghi cache cho PNR ${pnr} (${payload.length} bản ghi)...`);
              const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache`, {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(payload)
              });
              if (saveRes.ok) {
                console.log(`[Supabase] Lưu thành công PNR ${pnr} vào cache.`);
              } else {
                console.error('[Supabase] Ghi cache PNR thất bại:', await saveRes.text());
              }
            } catch (saveErr) {
              console.error('[Supabase] Lỗi khi lưu cache PNR:', saveErr);
            }
          }
        }

        const ticket_type = (hasAsterisk && parsedTicketClass) ? 'Vé bán' : null;
        const ticket_class = parsedTicketClass || null;
        sendResponse({ success: true, source: 'flightvn', data, ticket_type, ticket_class });
      } catch (err) {
        console.error('Lỗi khi tra cứu FlightVN PNR ' + pnr + ':', err);
        sendResponse({ success: false, error: err.message });
      }
    };

    handleFetch();
    return true; // Giữ kết nối bất đồng bộ
  }
});