
function getTicketClassification(ticketNumber) {
  if (!ticketNumber) return 'Vé';
  const cleaned = ticketNumber
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\\+u200[b-dB-D]/gi, '')
    .replace(/\\+ufeff/gi, '')
    .trim();
  
  if (/[-\*][Hh]$/.test(cleaned)) {
    return 'Hoàn';
  }
  if (/[-\*][Vv]$/.test(cleaned)) {
    return 'Void';
  }
  if (/\*1$/.test(cleaned)) {
    return 'Đổi';
  }
  if (/\*2$/.test(cleaned)) {
    return 'Hành lý';
  }
  
  if (/[^a-zA-Z0-9]$/.test(cleaned) || /[^a-zA-Z0-9][a-zA-Z0-9]{1,4}$/.test(cleaned)) {
    return 'Khác';
  }
  
  return 'Vé';
}

function convertToYmd(dateStr) {
  console.log('[Skyjet Helper] convertToYmd input:', JSON.stringify(dateStr));
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  // Pattern 1: Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    console.log('[Skyjet Helper] Already YYYY-MM-DD:', clean);
    return clean;
  }
  
  // Pattern 2: DD/MM/YYYY or D/M/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].length === 1 ? '0' + dmyMatch[1] : dmyMatch[1];
    const month = dmyMatch[2].length === 1 ? '0' + dmyMatch[2] : dmyMatch[2];
    const year = dmyMatch[3];
    const res = year + '-' + month + '-' + day;
    console.log('[Skyjet Helper] parsed DD/MM/YYYY match:', res);
    return res;
  }
  
  // Pattern 3: YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].length === 1 ? '0' + ymdMatch[2] : ymdMatch[2];
    const day = ymdMatch[3].length === 1 ? '0' + ymdMatch[3] : ymdMatch[3];
    const res = year + '-' + month + '-' + day;
    console.log('[Skyjet Helper] parsed YYYY/MM/DD match:', res);
    return res;
  }
  
  console.warn('[Skyjet Helper] convertToYmd fallback (not parsed):', clean);
  return clean;
}

function handleSearchTransactionQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const agentId = urlParams.get('skyjetAgentId');
  if (!agentId) return;

  const dateRangeVal = urlParams.get('skyjetDateRange');
  const fromDateVal = urlParams.get('skyjetFromDate');
  const toDateVal = urlParams.get('skyjetToDate');

  // Xử lý một lần duy nhất, xoá các tham số tự động để tránh lặp vô hạn khi khách tải lại trang thủ công
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + 
    window.location.search
      .replace(/[?&]skyjetAgentId=[^&]+/, '')
      .replace(/[?&]skyjetDateRange=[^&]+/, '')
      .replace(/[?&]skyjetFromDate=[^&]+/, '')
      .replace(/[?&]skyjetToDate=[^&]+/, '')
      .replace(/^&/, '?')
      .replace(/[?]$/, '');
  
  try {
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  } catch (e) {
    console.warn('[Skyjet Helper] Failed to replace state (possibly in data URI or sandboxed environment):', e);
  }

  const performAutoSearch = () => {
    // 1. Tìm và điền mã đại lý
    let selectEl = document.querySelector('select[id*="agent" i], select[id*="Agent" i], select[id*="customer" i], select[name*="agent" i], select[name*="Agent" i], #AgentId, #agent-id, #AgentCode, #agent_id');
    if (!selectEl) {
      selectEl = Array.from(document.querySelectorAll('select')).find(sel => {
        return Array.from(sel.options).some(opt => opt.value === agentId || opt.value.includes(agentId));
      }) || null;
    }

    if (selectEl) {
      selectEl.value = agentId;
      const matchOpt = Array.from(selectEl.options).find(opt => opt.value === agentId || opt.value.includes(agentId));
      if (matchOpt) {
        selectEl.value = matchOpt.value;
      }
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));

      // Hỗ trợ thư viện select2 của bên thứ 3
      const gJquery = window.$ || window.jQuery;
      if (gJquery && gJquery(selectEl).data('select2')) {
        gJquery(selectEl).val(selectEl.value).trigger('change');
      }
    } else {
      const textInput = document.querySelector('input[id*="agent" i], input[id*="Agent" i], input[placeholder*="đại lý" i], input[placeholder*="Đại lý" i], input[placeholder*="khách" i], input[placeholder*="Khách" i]');
      if (textInput) {
        textInput.value = agentId;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
        textInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 2. Điền khoảng thời gian
    if (dateRangeVal) {
      const dateRangeInp = document.querySelector('input.date-range, input.datepicker, input[id*="date-send-request"], input[id*="range" i]');
      if (dateRangeInp) {
        const isDateType = dateRangeInp.type === 'date';
        if (!isDateType) {
          dateRangeInp.value = dateRangeVal;
          dateRangeInp.dispatchEvent(new Event('input', { bubbles: true }));
          dateRangeInp.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const gJquery = window.$ || window.jQuery;
        const momentLib = window.moment;
        if (gJquery) {
          const picker = gJquery(dateRangeInp).data('daterangepicker');
          if (picker && momentLib) {
            const parts = dateRangeVal.split(/s*[-~]s*/);
            if (parts.length === 2) {
              picker.setStartDate(momentLib(parts[0], 'DD/MM/YYYY'));
              picker.setEndDate(momentLib(parts[1], 'DD/MM/YYYY'));
            }
          }
        }
      }
    }

    if (fromDateVal && toDateVal) {
      console.log('[Skyjet Helper] Detected date parameters in URL. From date raw:', JSON.stringify(fromDateVal), 'To date raw:', JSON.stringify(toDateVal));
      const fromInp = document.querySelector('input[id*="from" i], input[name*="from" i], input[id*="tu" i], input[name*="tu" i]');
      const toInp = document.querySelector('input[id*="to" i], input[name*="to" i], input[id*="den" i], input[name*="den" i]');
      
      if (fromInp && toInp) {
        const isFromDateType = fromInp.type === 'date';
        const isToDateType = toInp.type === 'date';
        console.log('[Skyjet Helper] Found inputs on page.', 'fromInp element:', fromInp, 'isDate:', isFromDateType, 'toInp element:', toInp, 'isDate:', isToDateType);

        const convertedFrom = isFromDateType ? convertToYmd(fromDateVal) : fromDateVal;
        const convertedTo = isToDateType ? convertToYmd(toDateVal) : toDateVal;

        console.log('[Skyjet Helper] Target values to set:', 'from:', JSON.stringify(convertedFrom), 'to:', JSON.stringify(convertedTo));
        
        fromInp.value = convertedFrom;
        toInp.value = convertedTo;

        fromInp.dispatchEvent(new Event('input', { bubbles: true }));
        fromInp.dispatchEvent(new Event('change', { bubbles: true }));
        toInp.dispatchEvent(new Event('input', { bubbles: true }));
        toInp.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Skyjet Helper] Assigned values successfully to inputs.');
      } else {
        console.error('[Skyjet Helper] Could not locate either fromDate input or toDate input on the page!', { fromInp, toInp });
      }
    }

    // 3. Tự động click tìm kiếm sau 700ms để đảm bảo các thành phần đã sẵn sàng
    setTimeout(() => {
      const searchBtn = document.querySelector('button[id*="search" i], button[id*="btn" i], input[type="submit"], #searchBtn, #btnSearch, .btn-search');
      if (searchBtn) {
        searchBtn.click();
      }
    }, 700);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performAutoSearch);
  } else {
    setTimeout(performAutoSearch, 400);
  }
}


function handleSearchAllOrderQuery() {
  // Chỉ chạy trên trang SearchAllOrder
  if (!window.location.pathname.toLowerCase().includes('/orderreportarea/orderreport/searchallorder')) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderRefId = urlParams.get('OrderReferenceId');
  const ticketNum = urlParams.get('TicketNumber') || urlParams.get('TicketNum') || urlParams.get('ticketnumber') || urlParams.get('ticketnum');
  const pnrVal = urlParams.get('PNR') || urlParams.get('pnr');
  const fallbackValue = pnrVal || ticketNum || orderRefId;

  const startSearch = (valueToFill) => {
    if (!valueToFill) return;
    
    console.log('[Skyjet Helper] Target value for SearchAllOrder:', valueToFill);

    let attempts = 0;
    const maxAttempts = 150; // 150 * 100ms = 15 giây
    const intervalId = setInterval(() => {
      attempts++;
      
      // Tìm ô input tìm kiếm với nhiều selector dự phòng
      const inputEl = document.querySelector(
        'input[name*="OrderReferenceId" i], ' +
        'input[id*="OrderReferenceId" i], ' +
        'input[name*="Order" i], ' +
        'input[id*="Order" i], ' +
        'input[placeholder*="Số vé hoặc PNR" i], ' +
        'input[placeholder*="Số vé" i], ' +
        'input[placeholder*="PNR" i], ' +
        'input[placeholder*="đơn hàng" i], ' +
        'input[placeholder*="Mã đơn" i], ' +
        'input[id*="ticket" i], ' +
        'input[name*="Ticket" i], ' +
        'input[id*="pnr" i]'
      );

      if (inputEl) {
        clearInterval(intervalId);
        
        inputEl.value = valueToFill;
        
        // Dispatch events để trigger framework binding (React/Angular/Vue/jQuery)
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Giả lập keyup/keydown
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
        inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
        
        console.log('[Skyjet Helper] Filled SearchAllOrder search input with:', valueToFill);

        // Tiến hành tìm nút tìm kiếm và click sau 300ms
        setTimeout(() => {
          let searchBtn = document.querySelector(
            'button[id*="search" i], ' +
            'button[id*="btn" i], ' +
            'button[class*="search" i], ' +
            'input[type="submit"], ' +
            '#searchBtn, ' +
            '#btnSearch, ' +
            '.btn-search, ' +
            '#btnSearchOrder'
          );
          
          if (!searchBtn) {
            // Fallback: tìm theo văn bản hiển thị
            searchBtn = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn')).find(el => {
              const txt = (el.textContent || el.value || '').trim().toLowerCase();
              return txt.includes('tìm kiếm') || txt.includes('tim kiem') || txt.includes('tìm') || txt.includes('search');
            }) || null;
          }

          if (searchBtn) {
            console.log('[Skyjet Helper] Triggering SearchAllOrder search click.');
            searchBtn.click();
          } else {
            // Nếu không tìm thấy button, thử submit form trực tiếp
            const form = inputEl.closest('form');
            if (form) {
              console.log('[Skyjet Helper] Search button not found, submitting form directly.');
              form.submit();
            } else {
              console.warn('[Skyjet Helper] Could not locate Search button or Form on SearchAllOrder page.');
            }
          }

          // Sau khi đã điền và submit thành công (hoặc cố gắng submit), tiến hành làm sạch URL
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname +
            window.location.search
              .replace(/[?&]OrderReferenceId=[^&]+/, '')
              .replace(/[?&]TicketNumber=[^&]+/, '')
              .replace(/[?&]TicketNum=[^&]+/, '')
              .replace(/[?&]ticketnumber=[^&]+/, '')
              .replace(/[?&]ticketnum=[^&]+/, '')
              .replace(/[?&]PNR=[^&]+/, '')
              .replace(/[?&]pnr=[^&]+/, '')
              .replace(/^&/, '?')
              .replace(/[?]$/, '');

          try {
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
            console.log('[Skyjet Helper] URL parameters cleaned.');
          } catch (e) {
            console.warn('[Skyjet Helper] Failed to replace state in SearchAllOrder:', e);
          }

        }, 300);

      } else if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        console.warn('[Skyjet Helper] Timeout waiting for SearchAllOrder search input.');
      }
    }, 100);
  };

  // Ưu tiên đọc từ chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['skyjet_pending_search'], (res) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        console.warn('[Skyjet Helper] Error reading local storage, falling back to URL params:', chrome.runtime.lastError);
        startSearch(fallbackValue);
        return;
      }
      
      const pending = res.skyjet_pending_search;
      // Kiểm tra nếu có dữ liệu hợp lệ trong vòng 60 giây
      if (pending && pending.value && (Date.now() - pending.timestamp < 60000)) {
        console.log('[Skyjet Helper] Found pending search in storage:', pending.value);
        // Xóa storage ngay để không lặp lại
        if (chrome.runtime && chrome.runtime.id) {
          chrome.storage.local.remove('skyjet_pending_search', () => {
            startSearch(pending.value);
          });
        } else {
          startSearch(pending.value);
        }
      } else {
        console.log('[Skyjet Helper] No valid pending search in storage or expired. Using URL fallback.');
        startSearch(fallbackValue);
      }
    });
  } else {
    startSearch(fallbackValue);
  }
}


function handleSearchTransactionCheck() {
  const table = document.getElementById('tableContent');
  if (!table) return;

  const headers = Array.from(table.querySelectorAll('thead th'));
  let orderCodeIndex = findHeaderIndex(headers, ['mã đơn hàng'], ['đơn hàng', 'mã đh']);
  if (orderCodeIndex === -1) orderCodeIndex = 5;

  let checkBtn = document.getElementById('skyjet-check-btn');
  if (checkBtn) {
    checkBtn.style.borderRadius = '20px';
  }
  let calcHeaderBtn = document.getElementById('skyjet-calc-header-btn');
  if (calcHeaderBtn) {
    calcHeaderBtn.style.borderRadius = '20px';
  }
  if (!checkBtn) {
    // Tìm phần tử chứa tiêu đề "Danh sách công nợ hiện tại"
    let titleEl = null;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, p, span, strong'));
    for (const el of headings) {
      if (el.innerText.trim().includes('Danh sách công nợ hiện tại')) {
        const hasBlockChildren = Array.from(el.children).some(child => ['DIV', 'P', 'TABLE', 'UL', 'OL'].includes(child.tagName));
        if (!hasBlockChildren) {
          titleEl = el;
          break;
        }
      }
    }

    if (!titleEl) {
      // Fallback: Tìm thẻ tiêu đề gần bảng tableContent nhất
      titleEl = document.querySelector('h1, h2, h3, h4, h5, h6, .x_title, .title_left');
    }

    if (titleEl) {
      checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.id = 'skyjet-check-btn';
      checkBtn.className = 'btn btn-info';
      checkBtn.innerHTML = '<i class="fa fa-check-circle"></i> Lấy dữ liệu';
      checkBtn.style.marginLeft = '12px';
      checkBtn.style.fontWeight = 'bold';
      checkBtn.style.backgroundColor = '#17a2b8';
      checkBtn.style.borderColor = '#17a2b8';
      checkBtn.style.color = '#ffffff';
      checkBtn.style.verticalAlign = 'middle';
      checkBtn.style.padding = '4px 10px';
      checkBtn.style.fontSize = '12px';
      checkBtn.style.borderRadius = '20px';

      checkBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await performTransactionChecking(checkBtn, table);
      });

      calcHeaderBtn = document.createElement('button');
      calcHeaderBtn.type = 'button';
      calcHeaderBtn.id = 'skyjet-calc-header-btn';
      calcHeaderBtn.className = 'btn btn-success';
      calcHeaderBtn.innerHTML = '<i class="fa fa-calculator" style="margin-right: 6px;"></i> Tính công nợ';
      calcHeaderBtn.style.marginLeft = '8px';
      calcHeaderBtn.style.fontWeight = 'bold';
      calcHeaderBtn.style.backgroundColor = '#28a745';
      calcHeaderBtn.style.borderColor = '#28a745';
      calcHeaderBtn.style.color = '#ffffff';
      calcHeaderBtn.style.verticalAlign = 'middle';
      calcHeaderBtn.style.padding = '4px 10px';
      calcHeaderBtn.style.fontSize = '12px';
      calcHeaderBtn.style.borderRadius = '20px';
      calcHeaderBtn.style.cursor = 'pointer';

      calcHeaderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCalculatorModal();
      });

      const calcPopupBtn = document.createElement('button');
      calcPopupBtn.type = 'button';
      calcPopupBtn.id = 'skyjet-calc-popup-btn';
      calcPopupBtn.className = 'btn btn-success';
      calcPopupBtn.innerHTML = '<i class="fa fa-calculator" style="margin-right: 6px;"></i> Tính công nợ';
      calcPopupBtn.style.position = 'fixed';
      calcPopupBtn.style.bottom = '24px';
      calcPopupBtn.style.right = '24px';
      calcPopupBtn.style.zIndex = '99999';
      calcPopupBtn.style.fontWeight = 'bold';
      calcPopupBtn.style.backgroundColor = '#28a745';
      calcPopupBtn.style.borderColor = '#218838';
      calcPopupBtn.style.color = '#ffffff';
      calcPopupBtn.style.padding = '12px 20px';
      calcPopupBtn.style.fontSize = '13px';
      calcPopupBtn.style.borderRadius = '50px';
      calcPopupBtn.style.boxShadow = '0 8px 24px rgba(40, 167, 69, 0.4)';
      calcPopupBtn.style.cursor = 'pointer';
      calcPopupBtn.style.display = 'none'; // Initially hidden, appears after data is fetched
      calcPopupBtn.style.alignItems = 'center';
      calcPopupBtn.style.transition = 'all 0.2s ease-in-out';

      calcPopupBtn.addEventListener('mouseenter', () => {
        calcPopupBtn.style.transform = 'scale(1.05)';
        calcPopupBtn.style.boxShadow = '0 10px 28px rgba(40, 167, 69, 0.5)';
      });
      calcPopupBtn.addEventListener('mouseleave', () => {
        calcPopupBtn.style.transform = 'scale(1)';
        calcPopupBtn.style.boxShadow = '0 8px 24px rgba(40, 167, 69, 0.4)';
      });

      const openCalculatorModal = () => {
        let container = document.getElementById('skyjet-calc-modal-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'skyjet-calc-modal-container';
          container.style.position = 'fixed';
          container.style.top = '0';
          container.style.left = '0';
          container.style.width = '100vw';
          container.style.height = '100vh';
          container.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
          container.style.zIndex = '999999';
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.justifyContent = 'center';
          container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
          
          const content = document.createElement('div');
          content.style.position = 'relative';
          content.style.width = '100%';
          content.style.maxWidth = '100%';
          content.style.height = '100%';
          content.style.backgroundColor = '#1e1e2e';
          content.style.borderRadius = '0px';
          content.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5)';
          content.style.display = 'flex';
          content.style.flexDirection = 'column';
          content.style.overflow = 'hidden';
          content.style.border = 'none';
          
          // Header
          const header = document.createElement('div');
          header.style.backgroundColor = '#181825';
          header.style.color = '#cdd6f4';
          header.style.padding = '12px 20px';
          header.style.display = 'flex';
          header.style.justifyContent = 'space-between';
          header.style.alignItems = 'center';
          header.style.borderBottom = '1px solid #313244';
          
          const titleContainer = document.createElement('div');
          titleContainer.style.display = 'flex';
          titleContainer.style.alignItems = 'center';
          titleContainer.style.gap = '16px';
          titleContainer.style.flex = '1';
          titleContainer.style.marginRight = '20px';
          
          const agencyInfo = document.createElement('div');
          agencyInfo.id = 'skyjet-header-agency-info';
          agencyInfo.style.display = 'flex';
          agencyInfo.style.alignItems = 'center';
          agencyInfo.style.gap = '12px';
          agencyInfo.style.fontSize = '12px';
          agencyInfo.style.color = '#a6adc8';
          titleContainer.appendChild(agencyInfo);

          header.appendChild(titleContainer);

          // Action Buttons Container in Header
          const actionContainer = document.createElement('div');
          actionContainer.id = 'skyjet-header-action-container';
          actionContainer.style.display = 'flex';
          actionContainer.style.alignItems = 'center';
          actionContainer.style.gap = '8px';
          actionContainer.style.marginRight = '16px';

          const captureBtn = document.createElement('button');
          captureBtn.innerHTML = `
            <svg style="width: 14px; height: 14px; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          `;
          captureBtn.title = "Chụp cuộn toàn bộ bảng tính công nợ";

          captureBtn.style.backgroundColor = '#0ea5e9';
          captureBtn.style.color = '#ffffff';
          captureBtn.style.border = '1px solid rgba(14, 165, 233, 0.2)';
          captureBtn.style.borderRadius = '50%';
          captureBtn.style.width = '30px';
          captureBtn.style.height = '30px';
          captureBtn.style.padding = '0';
          captureBtn.style.cursor = 'pointer';
          captureBtn.style.display = 'flex';
          captureBtn.style.alignItems = 'center';
          captureBtn.style.justifyContent = 'center';
          captureBtn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
          captureBtn.style.transition = 'all 0.15s ease-in-out';

          captureBtn.addEventListener('mouseenter', () => {
            captureBtn.style.backgroundColor = '#0284c7';
            captureBtn.style.transform = 'translateY(-1px)';
            captureBtn.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.25)';
          });
          captureBtn.addEventListener('mouseleave', () => {
            captureBtn.style.backgroundColor = '#0ea5e9';
            captureBtn.style.transform = 'translateY(0)';
            captureBtn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
          });
          captureBtn.addEventListener('mousedown', () => {
            captureBtn.style.transform = 'translateY(0) scale(0.9)';
          });
          captureBtn.addEventListener('mouseup', () => {
            captureBtn.style.transform = 'translateY(-1px) scale(1)';
          });

          captureBtn.addEventListener('click', () => {
            const iframe = container.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ action: 'skyjet_trigger_scroll_capture' }, '*');
            }
          });

          actionContainer.appendChild(captureBtn);
          header.appendChild(actionContainer);
          
          const closeBtn = document.createElement('button');
          closeBtn.innerHTML = '&times;';
          closeBtn.style.border = 'none';
          closeBtn.style.background = 'none';
          closeBtn.style.color = '#f38ba8';
          closeBtn.style.fontSize = '28px';
          closeBtn.style.cursor = 'pointer';
          closeBtn.style.lineHeight = '1';
          closeBtn.style.padding = '0';
          closeBtn.addEventListener('click', () => {
            container.style.display = 'none';
            document.body.style.overflow = '';
            const iframe = content.querySelector('iframe');
            if (iframe) iframe.src = 'about:blank';
          });
          header.appendChild(closeBtn);
          content.appendChild(header);
          
          // Iframe
          const iframe = document.createElement('iframe');
          iframe.style.flex = '1';
          iframe.style.border = 'none';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          content.appendChild(iframe);
          
          container.appendChild(content);
          document.body.appendChild(container);
        }
        
        container.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        const iframe = container.querySelector('iframe');
        if (iframe) {
          iframe.src = chrome.runtime.getURL('index.html?popup=true');
        }
      };
      
      calcPopupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCalculatorModal();
      });

      // Global window message event listener to communicate with local extension iframe
      if (!window.skyjetCalcMessageListenerAdded) {
        window.skyjetCalcMessageListenerAdded = true;
        window.addEventListener('message', (event) => {
          if (event.data === 'skyjet_calculator_ready') {
            const container = document.getElementById('skyjet-calc-modal-container');
            if (container) {
              const iframe = container.querySelector('iframe');
              if (iframe && iframe.contentWindow) {
                const xContentEl = document.querySelector('.content_container') || document.querySelector('.x_panel') || document.querySelector('.x_content');
                const xContentHtml = xContentEl ? xContentEl.outerHTML : '';
                const rect = iframe.getBoundingClientRect();
                iframe.contentWindow.postMessage({ 
                  action: 'import_x_content', 
                  html: xContentHtml,
                  iframeRect: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                  }
                }, '*');
              }
            }
          } else if (event.data && event.data.action === 'skyjet_update_agency_info') {
            const container = document.getElementById('skyjet-header-agency-info');
            if (container) {
              const { agencyName, agencyCode, agencyEmail, policyName } = event.data;
              const nameSpan = agencyName ? `<span style="color: #f9e2af; font-weight: 800; text-transform: uppercase;">Đại lý: ${agencyName}</span>` : '';
              const policySpan = policyName && policyName !== 'Không có' ? `<span style="color: #a6e3a1; font-weight: bold;">Chính sách: ${policyName}</span>` : '';
              const codeSpan = agencyCode && agencyCode !== 'Chưa có' ? `<span style="color: #f38ba8; font-weight: bold; background-color: rgba(243, 139, 168, 0.15); border: 1px solid rgba(243, 139, 168, 0.3); padding: 1px 6px; border-radius: 4px; font-size: 11px;">Mã KH: ${agencyCode}</span>` : '';
              const emailSpan = agencyEmail && agencyEmail !== 'Chưa có' ? `<span style="color: #cdd6f4; font-family: monospace; font-size: 11px;">Email: ${agencyEmail}</span>` : '';
              
              container.innerHTML = [nameSpan, policySpan, codeSpan, emailSpan].filter(Boolean).join(' <span style="color: #45475a;">|</span> ');
            }
          } else if (event.data && event.data.action === 'skyjet_show_preview') {
            if (typeof showImagePreviewModal === 'function') {
              showImagePreviewModal(event.data.dataUrl);
            } else {
              console.error('showImagePreviewModal is not defined in scope');
            }
          }
        });
      }

      // Chèn nút ngay sau phần tử tiêu đề hoặc kế bên text
      if (titleEl.tagName === 'STRONG' || titleEl.tagName === 'SPAN') {
        if (titleEl.parentNode) {
          titleEl.parentNode.insertBefore(checkBtn, titleEl.nextSibling);
          titleEl.parentNode.insertBefore(calcHeaderBtn, checkBtn.nextSibling);
        }
      } else {
        titleEl.style.display = 'inline-block';
        titleEl.appendChild(checkBtn);
        titleEl.appendChild(calcHeaderBtn);
      }
      // Chèn nút nổi Tính công nợ vào body
      document.body.appendChild(calcPopupBtn);
    }
  }

  const currentBtn = document.getElementById('skyjet-check-btn') || checkBtn;
  const isBusy = currentBtn && currentBtn.disabled;

  // Tự động khôi phục cột nếu có sẵn cache và không bận
  const hasTypeCol = headers.some(th => {
    if (th.innerText.trim() === 'Loại vé') {
      th.dataset.skyjetTypeCol = "true";
      return true;
    }
    return false;
  });
  const hasClassCol = headers.some(th => th.innerText.trim() === 'Hạng vé');
  const hasTimeCol = headers.some(th => {
    if (th.innerText.trim() === 'Thời gian bay') {
      th.dataset.skyjetTimeCol = "true";
      return true;
    }
    return false;
  });
  const hasChannelCol = headers.some(th => {
    if (th.innerText.trim() === 'Kênh') {
      th.dataset.skyjetChannelCol = "true";
      return true;
    }
    return false;
  });
  const columnsMissing = !hasTypeCol || !hasClassCol || !hasTimeCol || !hasChannelCol;

  if (columnsMissing && !isBusy && table.skyjetResultsMap && table.skyjetVnaResultsMap) {
    console.log('[Skyjet Helper] Detected missing columns with existing cache. Re-rendering dynamically.');
    renderTransactionColumns(table, table.skyjetResultsMap, table.skyjetVnaResultsMap);
  }

  // Tự động lấy dữ liệu từ Supabase nếu bật cấu hình
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['autoFetchSupabase'], (res) => {
      const isAgentHost = window.location.hostname.includes('agent.skyjet.vn');
      if (isAgentHost && res.autoFetchSupabase) {
        const btn = document.getElementById('skyjet-check-btn') || checkBtn;
        if (btn && !btn.disabled) {
          // Lấy dữ liệu lần đầu tiên khi tải bảng
          setTimeout(() => {
            if (btn && !btn.disabled) {
              console.log('[Skyjet Helper] Tự động lấy dữ liệu lần đầu từ Supabase...');
              performTransactionChecking(btn, table, true);
            }
          }, 600);

          // Cài đặt MutationObserver trên tbody của bảng
          if (!window.skyjetAutoFetchObserverActive) {
            window.skyjetAutoFetchObserverActive = true;
            let debounceTimeout = null;
            const observer = new MutationObserver((mutations) => {
              if (window.skyjetIsAutoFetching) return;
              if (debounceTimeout) clearTimeout(debounceTimeout);
              debounceTimeout = setTimeout(() => {
                const refreshedTable = document.getElementById('tableContent');
                const refreshedBtn = document.getElementById('skyjet-check-btn');
                if (refreshedTable && refreshedBtn && !refreshedBtn.disabled) {
                  console.log('[Skyjet Helper] Tự động lấy dữ liệu sau khi lọc công nợ...');
                  performTransactionChecking(refreshedBtn, refreshedTable, true);
                }
              }, 800);
            });
            const tbody = table.querySelector('tbody');
            if (tbody) {
              observer.observe(tbody, { childList: true });
            }
          }
        }
      }
    });
  }
}

function getTicketNumFromRow(row, headers) {
  const cells = row.querySelectorAll('td');
  let soVeColIdx = -1;
  if (headers) {
    soVeColIdx = findHeaderIndex(headers, ['số vé', 'so ve']);
  }
  if (soVeColIdx === -1) {
    soVeColIdx = 8;
  }
  return cells[soVeColIdx]?.innerText?.trim() || '';
}

function getCurrentAgencyCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlAgentId = urlParams.get('skyjetAgentId');
  if (urlAgentId) return urlAgentId;

  const selectEl = document.querySelector('select[id*="agent" i], select[id*="Agent" i], select[id*="customer" i], select[name*="agent" i], select[name*="Agent" i], #AgentId, #agent-id, #AgentCode, #agent_id');
  if (selectEl && selectEl.value) {
    const val = selectEl.value.trim();
    if (val && val !== '0' && val !== '-1') {
      return val;
    }
  }
  return 'SJNTRH';
}

async function performTransactionChecking(btn, table, isAutoLoad = false) {
  if (btn.disabled) return;
  window.skyjetIsAutoFetching = true;

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    const originalBtnText = btn.innerHTML.includes('Chưa đăng nhập FlightVN') ? '<i class="fa fa-check-circle"></i> Lấy dữ liệu' : btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="skyjet-spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#ffffff; display:inline-block; margin-right:4px;"></span> Đang kiểm tra đăng nhập FlightVN...';
    try {
      const loginCheck = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'check_flightvn_login' }, (res) => {
          resolve(res || { success: false, error: 'Không phản hồi' });
        });
      });
      if (!loginCheck || !loginCheck.success) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Chưa đăng nhập FlightVN (Thử lại)';
        if (!isAutoLoad) {
          chrome.runtime.sendMessage({ action: 'open_flightvn_login' });
        }
        return;
      }
    } catch (loginErr) {
      console.error('[Skyjet Helper] Lỗi kiểm tra đăng nhập FlightVN:', loginErr);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
    }
  }

  let hasLoginError = false;
  const headers = Array.from(table.querySelectorAll('thead th'));
  let orderCodeIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeIndex = i;
      break;
    }
  }
  if (orderCodeIndex === -1) {
    orderCodeIndex = 5;
  }

  const isRefundRow = (row) => {
    const cells = row.querySelectorAll('td');
    const loaiVeColIdx = findHeaderIndex(headers, ['loại vé', 'loai ve', 'loại', 'loai']);
    if (loaiVeColIdx !== -1 && cells[loaiVeColIdx]) {
      const text = cells[loaiVeColIdx].innerText.trim().toLowerCase();
      if (text.includes('hoàn') || text.includes('hoan')) {
        return true;
      }
    }
    const ticketNum = getTicketNumFromRow(row, headers);
    if (ticketNum && (
      ticketNum.endsWith('-H') || 
      ticketNum.endsWith('-h') || 
      ticketNum.endsWith('*H') || 
      ticketNum.endsWith('*h')
    )) {
      return true;
    }
    return false;
  };

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  
  // Lưu lại giá trị Hạng vé ban đầu trước khi bị xoá sạch để phục vụ kiểm tra
  const originalTicketClasses = new Map(); // rowIndex -> text
  const oldTargetClassHeaderIndex = findHeaderIndex(headers, ['hạng vé', 'hang ve'], ['hạng', 'hang']);
  if (oldTargetClassHeaderIndex !== -1) {
    rows.forEach((row, rIdx) => {
      const cells = row.querySelectorAll('td');
      if (cells[oldTargetClassHeaderIndex]) {
        originalTicketClasses.set(rIdx, cells[oldTargetClassHeaderIndex].innerText || '');
        cells[oldTargetClassHeaderIndex].innerHTML = '';
      }
    });
  }



  // Làm mới kết quả kiểm tra cũ trong cột Thời gian bay (nếu có)
  let oldTargetTimeHeaderIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].innerText.trim() === 'Thời gian bay') {
      headers[i].dataset.skyjetTimeCol = "true";
      oldTargetTimeHeaderIndex = i;
      break;
    }
  }
  if (oldTargetTimeHeaderIndex !== -1) {
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells[oldTargetTimeHeaderIndex]) {
        cells[oldTargetTimeHeaderIndex].innerHTML = '';
      }
    });
  }

  const dateColIdx = findHeaderIndex(headers, ['ngày chứng từ', 'ngay chung tu', 'ngày ct', 'ngay ct'], ['ngày', 'ngay']);
  const orderCodes = [];
  const pnrCarrierMap = new Map();
  const pnrDateMap = new Map();
  rows.forEach(row => {
    if (row.style.display === 'none' || row.offsetHeight === 0) {
      return;
    }
    if (isRefundRow(row)) {
      return;
    }
    const cells = row.querySelectorAll('td');
    if (cells.length > orderCodeIndex) {
      const code = cells[orderCodeIndex].innerText.trim();
      let rawCode = cells[orderCodeIndex].querySelector('.skyjet-btn span')?.innerText?.trim() || code;
      if (rawCode.includes('*0')) {
        return;
      }
      if (rawCode && rawCode !== '0' && rawCode.length >= 3 && !rawCode.includes('Tổng') && !rawCode.includes('TỔNG')) {
        let cleanCode = rawCode.split('*')[0].trim();
        if (cleanCode && !orderCodes.includes(cleanCode)) {
          orderCodes.push(cleanCode);
        }
        const chungTuVal = getChungTuFromRow(row, table);
        const airlineId = mapChungTuToAirlineId(chungTuVal);
        let carrier = null;
        if (airlineId === 'VNA') carrier = 'VN';
        else if (airlineId === 'SPA') carrier = '9G';
        else if (airlineId === 'VIETJET') carrier = 'VJ';
        else if (airlineId === 'BAMBOO') carrier = 'QH';
        else if (airlineId === 'VIETRAVEL') carrier = 'VU';
        if (cleanCode && carrier) {
          pnrCarrierMap.set(cleanCode, carrier);
        }

        let rawDate = '';
        if (dateColIdx !== -1 && cells[dateColIdx]) {
          rawDate = cells[dateColIdx].innerText.trim();
        }
        const dateVal = convertToYmd(rawDate);
        if (cleanCode && dateVal) {
          pnrDateMap.set(cleanCode, dateVal);
        }
      }
    }
  });

  if (orderCodes.length === 0) {
    if (!isAutoLoad) {
      alert('Không tìm thấy mã đơn hàng nào trên trang hiện tại để kiểm tra.');
    }
    return;
  }

  const originalBtnText = btn.innerHTML.includes('Chưa đăng nhập FlightVN') ? '<i class="fa fa-check-circle"></i> Lấy dữ liệu' : btn.innerHTML;
  btn.disabled = true;

  btn.innerHTML = '<span class="skyjet-spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#ffffff; display:inline-block; margin-right:4px;"></span> Đang truy vấn cache Supabase...';

  try {
    const pnrToTickets = new Map();
  rows.forEach(row => {
    if (row.style.display === 'none' || row.offsetHeight === 0) {
      return;
    }
    if (isRefundRow(row)) {
      return;
    }
    const cells = row.querySelectorAll('td');
    if (cells.length > orderCodeIndex) {
      const code = cells[orderCodeIndex].innerText.trim();
      let rawCode = cells[orderCodeIndex].querySelector('.skyjet-btn span')?.innerText?.trim() || code;
      if (rawCode.includes('*0')) {
        return;
      }
      if (rawCode && rawCode !== '0' && rawCode.length >= 3 && !rawCode.includes('Tổng') && !rawCode.includes('TỔNG')) {
        let cleanCode = rawCode.split('*')[0].trim();
        if (cleanCode) {
          const ticketNum = getTicketNumFromRow(row, headers);
          if (ticketNum) {
            if (!pnrToTickets.has(cleanCode)) {
              pnrToTickets.set(cleanCode, new Set());
            }
            pnrToTickets.get(cleanCode).add(ticketNum);
          }
        }
      }
    }
  });

  const allTicketNumbers = [];
  pnrToTickets.forEach((tickets) => {
    tickets.forEach(ticket => {
      if (ticket) allTicketNumbers.push(ticket);
    });
  });

  const cachedTicketsMap = new Map();
  const cachedPnrsMap = new Map();
  table.skyjetCachedTicketsMap = cachedTicketsMap;
  table.skyjetCachedPnrsMap = cachedPnrsMap;
  if ((allTicketNumbers.length > 0 || orderCodes.length > 0) && !window.skyjetExtensionInvalidated) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const cacheResponse = await new Promise((resolve) => {
          let resolved = false;
          const timeoutId = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.warn('[Skyjet Helper] check_ticket_cache timeout reached, resolving with null');
              resolve(null);
            }
          }, 5000);

          try {
            chrome.runtime.sendMessage({
              action: 'check_ticket_cache',
              ticketNumbers: allTicketNumbers,
              pnrCodes: orderCodes
            }, (res) => {
              try {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeoutId);
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                    console.warn('[Skyjet Helper] runtime.lastError during cache check:', chrome.runtime.lastError);
                  }
                  resolve(res || null);
                }
              } catch (err) {
                if (err.message && err.message.includes('Extension context invalidated')) {
                  window.skyjetExtensionInvalidated = true;
                } else {
                  console.error('[Skyjet Helper] Exception in check_ticket_cache callback:', err);
                }
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeoutId);
                  resolve(null);
                }
              }
            });
          } catch (e) {
            if (e.message && e.message.includes('Extension context invalidated')) {
              window.skyjetExtensionInvalidated = true;
              console.warn('[Skyjet Helper] Extension context invalidated. Cache checking skipped.');
            } else {
              console.error('[Skyjet Helper] Exception sending check_ticket_cache message:', e);
            }
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              resolve(null);
            }
          }
        });
        if (cacheResponse && cacheResponse.success && Array.isArray(cacheResponse.data)) {
          cacheResponse.data.forEach(item => {
            if (item.ticket_number) {
              cachedTicketsMap.set(item.ticket_number, item);
            }
            if (item.pnr_code) {
              const cleanPnr = item.pnr_code.split('*')[0].trim();
              cachedPnrsMap.set(cleanPnr, item);
            }
          });
        }
      }
    } catch (err) {
      console.error('[Skyjet Helper] Lỗi khi kiểm tra cache vé từ Supabase:', err);
    }
  }

  const orderCodesToScan = [];
  const resultsMap = new Map();
  const vnaResultsMap = new Map();
  const vnaRequests = [];


    const isAgentHost = window.location.hostname.includes('agent.skyjet.vn');

    // Manual checking: only query ERP for ticket numbers not present in Supabase cache
    orderCodes.forEach(code => {
      const tickets = pnrToTickets.get(code);
      if (!tickets || tickets.size === 0) {
        if (cachedPnrsMap.has(code)) {
          const cached = cachedPnrsMap.get(code);
          if (cached && cached.channel) {
            const classes = cached.ticket_class ? [cached.ticket_class] : [];
            const ticketTypes = cached.ticket_type ? [cached.ticket_type] : [];
            const ticketList = [{
              ticketNum: '-',
              ticketClass: cached.ticket_class || '',
              ticketType: cached.ticket_type || '',
              passengerName: '',
              channel: cached.channel
            }];
            resultsMap.set(code, { ticketList, classes, ticketTypes });
            return;
          }
        }
        if (isAgentHost) {
          resultsMap.set(code, {
            ticketList: [{
              ticketNum: '-',
              ticketClass: '',
              ticketType: 'X',
              passengerName: '',
              channel: 'PARTNER'
            }],
            classes: [],
            ticketTypes: ['X']
          });
        } else {
          orderCodesToScan.push(code);
        }
        return;
      }

      let allCached = true;
      const ticketList = [];
      const classes = [];
      const ticketTypes = [];

      for (const tNum of tickets) {
        if (cachedTicketsMap.has(tNum)) {
          const cached = cachedTicketsMap.get(tNum);
          if (cached && cached.channel) {
            if (cached.ticket_class && !classes.includes(cached.ticket_class)) {
              classes.push(cached.ticket_class);
            }
            if (cached.ticket_type && !ticketTypes.includes(cached.ticket_type)) {
              ticketTypes.push(cached.ticket_type);
            }
            ticketList.push({
              ticketNum: tNum,
              ticketClass: cached.ticket_class || '',
              ticketType: cached.ticket_type || '',
              passengerName: '',
              channel: cached.channel
            });
          } else if (isAgentHost) {
            if (!ticketTypes.includes('X')) ticketTypes.push('X');
            ticketList.push({
              ticketNum: tNum,
              ticketClass: (cached && cached.ticket_class) || '',
              ticketType: 'X',
              passengerName: '',
              channel: (cached && cached.channel) || 'PARTNER'
            });
          } else {
            allCached = false;
          }
        } else if (isAgentHost) {
          if (!ticketTypes.includes('X')) ticketTypes.push('X');
          ticketList.push({
            ticketNum: tNum,
            ticketClass: '',
            ticketType: 'X',
            passengerName: '',
            channel: 'PARTNER'
          });
        } else {
          allCached = false;
        }
      }

      if (allCached || isAgentHost) {
        resultsMap.set(code, { ticketList, classes, ticketTypes });
      } else {
        if (cachedPnrsMap.has(code)) {
          // If we have PNR cache, we can still use it as a partial/full mapping to avoid scanning if it's considered fully cached
          const cached = cachedPnrsMap.get(code);
          if (cached && cached.channel) {
            const fallbackClasses = cached.ticket_class ? [cached.ticket_class] : [];
            const fallbackTicketTypes = cached.ticket_type ? [cached.ticket_type] : [];
            resultsMap.set(code, { ticketList, classes: fallbackClasses, ticketTypes: fallbackTicketTypes });
          } else {
            orderCodesToScan.push(code);
          }
        } else {
          orderCodesToScan.push(code);
        }
      }
    });

    const pnrHasJsonData = new Set();
    cachedTicketsMap.forEach(cached => {
      if (cached.pnr_code && cached.flight === true) {
        pnrHasJsonData.add(cached.pnr_code);
      }
    });
    cachedPnrsMap.forEach((cached, pnrCode) => {
      if (cached.flight === true) {
        pnrHasJsonData.add(pnrCode);
      }
    });

    orderCodes.forEach(code => {
      const tickets = pnrToTickets.get(code);
      let cachedJsonData = null;
      let cachedFare = null;
      if (tickets && tickets.size > 0) {
        for (const tNum of tickets) {
          const cached = cachedTicketsMap.get(tNum);
          if (cached && cached.json_data && cached.channel) {
            let parsed = cached.json_data;
            if (typeof parsed === 'string') {
              try {
                parsed = JSON.parse(parsed);
              } catch (e) {}
            }
            if (parsed && parsed.length > 0) {
              cachedJsonData = parsed;
              if (cached.fare !== undefined && cached.fare !== null) {
                cachedFare = cached.fare;
              }
              break;
            }
          }
        }
      }
      if (!cachedJsonData && cachedPnrsMap.has(code)) {
        const cached = cachedPnrsMap.get(code);
        if (cached && cached.json_data && cached.channel) {
          let parsed = cached.json_data;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch (e) {}
          }
          if (parsed && parsed.length > 0) {
            cachedJsonData = parsed;
            if (cached.fare !== undefined && cached.fare !== null) {
              cachedFare = cached.fare;
            }
          }
        }
      }
      if (cachedJsonData) {
        vnaResultsMap.set(code, {
          success: true,
          data: {
            reservation: {
              originDestinationOptions: [{ flightSegments: cachedJsonData }],
              passengers: []
            }
          },
          fare: cachedFare
        });
      }
    });

    // 1. Tìm toàn bộ PNR có bất kỳ dòng nào chứa Hạng vé trống
    const pnrsWithEmptyClass = new Set();
    const vnaKeys = new Set();
    const hangVeIdx = findHeaderIndex(headers, ['hạng vé', 'hang ve', 'hạng', 'hang']);
    console.log('[Skyjet Debug] hangVeIdx:', hangVeIdx, 'headers:', headers.map(h => h.innerText.trim()));

    rows.forEach((row, rIdx) => {
      if (row.style.display === 'none' || row.offsetHeight === 0) return;
      if (isRefundRow(row)) return;
      const cells = row.querySelectorAll('td');
      if (cells.length > orderCodeIndex) {
        const code = cells[orderCodeIndex].innerText.trim();
        if (code && code !== '0' && code.length >= 3 && !code.includes('Tổng') && !code.includes('TỔNG')) {
          const rawCode = cells[orderCodeIndex].querySelector('.skyjet-btn span')?.innerText?.trim() || code;
          if (rawCode.includes('*0')) return;
          const cleanCode = rawCode.split('*')[0].trim();
          
          const savedClassText = originalTicketClasses.get(rIdx);
          if (savedClassText !== undefined && savedClassText !== null) {
            const hangVeText = savedClassText.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ').trim();
            console.log(`[Skyjet Debug] Dòng ${rIdx + 1} | PNR: ${cleanCode} | Hạng gốc lưu trữ: "${savedClassText}" | Hạng đã lọc: "${hangVeText}"`);
            if (hangVeText === '' || hangVeText === '-' || hangVeText === 'empty' || hangVeText === 'null') {
              console.log(`[Skyjet Debug] -> Đã thêm PNR ${cleanCode} vào danh sách KHÔNG quét vì hạng vé trống`);
              pnrsWithEmptyClass.add(cleanCode);
            }
          } else {
            console.log(`[Skyjet Debug] Dòng ${rIdx + 1} | PNR: ${cleanCode} | Không tìm thấy hạng gốc lưu trữ`);
          }
        }
      }
    });

    rows.forEach((row, rIdx) => {
      if (row.style.display === 'none' || row.offsetHeight === 0) return;
      if (isRefundRow(row)) return;
      const cells = row.querySelectorAll('td');
      if (cells.length > orderCodeIndex) {
        const code = cells[orderCodeIndex].innerText.trim();
        if (code && code !== '0' && code.length >= 3 && !code.includes('Tổng') && !code.includes('TỔNG')) {
          const rawCode = cells[orderCodeIndex].querySelector('.skyjet-btn span')?.innerText?.trim() || code;
          if (rawCode.includes('*0')) return;
          const cleanCode = rawCode.split('*')[0].trim();
          const hasAsterisk = rawCode.includes('*');
          
          if (pnrsWithEmptyClass.has(cleanCode)) {
            console.log(`[Skyjet Debug] Dòng ${rIdx + 1} | Bỏ qua quét PNR: ${cleanCode} vì nằm trong pnrsWithEmptyClass`);
            return;
          }

          const isFullyCached = !orderCodesToScan.includes(cleanCode);
          const savedClassText = originalTicketClasses.get(rIdx);
          console.log(`[Skyjet Debug] Dòng ${rIdx + 1} | Đánh giá PNR: ${cleanCode} | Hạng vé: "${savedClassText}" | isFullyCached: ${isFullyCached}`);
          if (!isFullyCached) {
            const chungTuVal = getChungTuFromRow(row, table);
            const airlineId = mapChungTuToAirlineId(chungTuVal);
            if (airlineId === 'VNA' || airlineId === 'SPA' || airlineId === 'VIETJET' || airlineId === 'BAMBOO' || airlineId === 'VIETRAVEL') {
              if (cleanCode) {
                const key = cleanCode;
                if (!vnaKeys.has(key)) {
                  vnaKeys.add(key);
                  const passengerName = getPassengerNameFromRow(row, table);
                  const nameParts = passengerName.trim().split(/\s+/);
                  const lastName = nameParts[0] || '';
                  const agCode = getCurrentAgencyCode() || 'SJNTRH';
                  const dateCom = pnrDateMap.get(cleanCode) || null;
                  console.log(`[Skyjet Debug] -> ĐỒNG Ý ĐƯA VÀO QUÉT FLIGHTVN: PNR ${cleanCode} (${airlineId})`);
                  vnaRequests.push({ pnr: cleanCode, lastName, passengerName, airlineId, hasAsterisk, agCode, dateCom });
                }
              }
            }
          }
        }
      }
    });

    let ticketCompletedCount = orderCodes.length - orderCodesToScan.length;
    let vnaCompletedCount = 0;
    let currentPnr = '';

    const updateProgress = () => {
      let text = 'Đang kiểm tra (' + ticketCompletedCount + '/' + orderCodes.length + ')';
      if (vnaRequests.length > 0) {
        text += ' - Quét PNR (' + vnaCompletedCount + '/' + vnaRequests.length + ')';
        if (currentPnr) {
          const req = vnaRequests.find(r => r.pnr === currentPnr);
          if (req) {
            let carrierCode = req.airlineId;
            if (carrierCode === 'SPA') carrierCode = '9G';
            else if (carrierCode === 'VIETJET') carrierCode = 'VJ';
            else if (carrierCode === 'BAMBOO') carrierCode = 'QH';
            else if (carrierCode === 'VIETRAVEL') carrierCode = 'VU';
            else if (carrierCode === 'VNA') carrierCode = 'VN';
            text += ': ' + currentPnr + ' (' + carrierCode + ')';
          } else {
            text += ': ' + currentPnr;
          }
        }
      }
      btn.innerHTML = '<span class="skyjet-spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#ffffff; display:inline-block; margin-right:4px;"></span> ' + text + '...';
    };

    const fetchVnaSequentially = async () => {
      let networkCallCount = 0;
      for (let i = 0; i < vnaRequests.length; i++) {
        const req = vnaRequests[i];
        currentPnr = req.pnr;
        updateProgress();
        
        if (vnaResultsMap.has(req.pnr)) {
          vnaCompletedCount++;
          updateProgress();
          continue;
        }
        if (networkCallCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        networkCallCount++;
        if (window.skyjetExtensionInvalidated) {
          vnaCompletedCount++;
          updateProgress();
          continue;
        }
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            console.log('[Skyjet Helper] Bắt đầu tra cứu PNR: ' + req.pnr + ' (?airlineId=' + req.airlineId + ')');
            const response = await new Promise((resolve) => {
              let resolved = false;
              const timeoutId = setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  console.warn('[Skyjet Helper] fetch_vietnamairlines timeout reached for PNR:', req.pnr);
                  resolve(null);
                }
              }, 15000);

              try {
                 chrome.runtime.sendMessage({
                  action: 'fetch_vietnamairlines',
                  pnr: req.pnr,
                  lastName: req.lastName,
                  passengerName: req.passengerName,
                  airlineId: req.airlineId,
                  hasAsterisk: req.hasAsterisk,
                  ticketNumbers: Array.from(pnrToTickets.get(req.pnr) || []),
                  agCode: req.agCode,
                  dateCom: req.dateCom
                }, (res) => {
                  try {
                    if (!resolved) {
                      resolved = true;
                      clearTimeout(timeoutId);
                      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                        console.warn('[Skyjet Helper] Lỗi runtime.lastError khi tra cứu VNA:', chrome.runtime.lastError);
                      }
                      resolve(res || null);
                    }
                  } catch (err) {
                    if (err.message && err.message.includes('Extension context invalidated')) {
                      window.skyjetExtensionInvalidated = true;
                    } else {
                      console.error('[Skyjet Helper] Exception in fetch_vietnamairlines callback:', err);
                    }
                    if (!resolved) {
                      resolved = true;
                      clearTimeout(timeoutId);
                      resolve(null);
                    }
                  }
                });
              } catch (e) {
                if (e.message && e.message.includes('Extension context invalidated')) {
                  window.skyjetExtensionInvalidated = true;
                  console.warn('[Skyjet Helper] Extension context invalidated. Skipping background communication.');
                } else {
                  console.error('[Skyjet Helper] Exception sending fetch_vietnamairlines message:', e);
                }
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeoutId);
                  resolve(null);
                }
              }
            });
            if (response) {
              const sourceStr = response.source === 'cache' ? 'Supabase Cache' : 'FlightVN';
              console.log('[Skyjet Helper] Phản hồi nhận được từ ' + sourceStr + ' cho PNR: ' + req.pnr, response);
              if (response.success && response.data && typeof response.data === 'string') {
                try {
                  response.data = JSON.parse(response.data);
                } catch (e) {
                  console.error('Error parsing response.data string:', e);
                }
              }
              vnaResultsMap.set(req.pnr, response);
              if (response.success && response.ticketFareMap) {
                for (const [tktNum, fareVal] of Object.entries(response.ticketFareMap)) {
                  if (tktNum) {
                    const existing = cachedTicketsMap.get(tktNum) || {};
                    const finalFare = (existing.fare !== undefined && existing.fare !== null) ? existing.fare : fareVal;
                    cachedTicketsMap.set(tktNum, { ...existing, ticket_number: tktNum, fare: finalFare });
                  }
                }
              }
              if (response.success === false && (response.error === 'Chưa đăng nhập FlightVN' || response.error?.toLowerCase().includes('dang nhap') || response.error?.toLowerCase().includes('đăng nhập'))) {
                hasLoginError = true;
                if (!isAutoLoad) {
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    try {
                      chrome.runtime.sendMessage({ action: 'open_flightvn_login' });
                    } catch (loginErr) {
                      if (loginErr.message && loginErr.message.includes('Extension context invalidated')) {
                        window.skyjetExtensionInvalidated = true;
                      } else {
                        console.error(loginErr);
                      }
                    }
                  } else {
                    window.open('https://flightvn.com/Booking/ImportBooking', '_blank');
                  }
                }
                break;
              }
              if (response.success) {
                const ticketClass = response.ticket_class;
                const ticketType = response.ticket_type;
                if (ticketClass || ticketType) {
                  let currentResult = resultsMap.get(req.pnr);
                  if (!currentResult) {
                    currentResult = { ticketList: [], classes: [], ticketTypes: [] };
                    resultsMap.set(req.pnr, currentResult);
                  }
                  if (ticketClass) {
                    if (!currentResult.classes.includes(ticketClass)) {
                      currentResult.classes.push(ticketClass);
                    }
                    currentResult.ticketList.forEach(t => {
                      if (!t.ticketClass) t.ticketClass = ticketClass;
                    });
                  }
                  if (ticketType) {
                    if (!currentResult.ticketTypes.includes(ticketType)) {
                      currentResult.ticketTypes.push(ticketType);
                    }
                    currentResult.ticketList.forEach(t => {
                      if (!t.ticketType) t.ticketType = ticketType;
                    });
                  }
                }
              }
            } else {
              if (!window.skyjetExtensionInvalidated) {
                console.error('[Skyjet Helper] Không nhận được phản hồi từ background cho PNR: ' + req.pnr);
              }
            }
          }
        } catch (error) {
          if (error.message && error.message.includes('Extension context invalidated')) {
            window.skyjetExtensionInvalidated = true;
          } else {
            console.error('[Skyjet Helper] Error fetching VNA data for PNR: ' + req.pnr, error);
          }
        } finally {
          vnaCompletedCount++;
          updateProgress();
        }
      }
      currentPnr = '';
      updateProgress();
    };

    const isAgentHost = window.location.hostname.includes('agent.skyjet.vn');
    await Promise.all([
      ...(isAgentHost ? [] : orderCodesToScan.map(async (code) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          try {
            controller.abort();
          } catch (e) {}
        }, 15000);

        try {
          const origin = (window.location.origin && window.location.origin !== 'null' && !window.location.protocol.startsWith('data')) ? window.location.origin : 'https://erp.skyjet.vn';
          const response = await fetch(origin + '/OrderReportArea/OrderReport/SearchAllOrder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: 'OrderReferenceId=' + encodeURIComponent(code),
            signal: controller.signal
          });
          if (response.ok) {
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const searchTable = doc.querySelector('#gridItem') || doc.querySelector('table');
            if (searchTable) {
              const detailRows = Array.from(searchTable.querySelectorAll('tbody tr'));
              const ticketList = [];
              const classes = [];
              const ticketTypes = [];

              const subHeaders = Array.from(searchTable.querySelectorAll('thead th')).map(th => th.innerText.trim().toLowerCase());
              let subTicketColIdx = findHeaderIndex(subHeaders, [], ['số vé', 'so ve']);
              let subClassColIdx = findHeaderIndex(subHeaders, ['hạng', 'hang'], ['hạng vé']);
              let subTypeColIdx = findHeaderIndex(subHeaders, [], ['loại vé', 'loai ve']);
              let subPassengerColIdx = findHeaderIndex(subHeaders, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach']);
              let subChannelColIdx = findHeaderIndex(subHeaders, ['kênh', 'kenh', 'channel'], ['kênh bán', 'kenh ban']);

              let subFareColIdx = findHeaderIndex(subHeaders, ['giá', 'gia', 'giá vé', 'gia ve'], []);

              const newTicketsToCache = [];

              detailRows.forEach(dRow => {
                const dCells = dRow.querySelectorAll('td');
                if (dCells.length > 0) {
                  const tNum = subTicketColIdx !== -1 && dCells[subTicketColIdx] ? dCells[subTicketColIdx].innerText.trim() : '';
                  const tClass = subClassColIdx !== -1 && dCells[subClassColIdx] ? dCells[subClassColIdx].innerText.trim() : '';
                  let tType = subTypeColIdx !== -1 && dCells[subTypeColIdx] ? dCells[subTypeColIdx].innerText.trim() : '';
                  const passengerName = subPassengerColIdx !== -1 && dCells[subPassengerColIdx] ? dCells[subPassengerColIdx].innerText.trim() : '';
                  const tChannel = subChannelColIdx !== -1 && dCells[subChannelColIdx] ? dCells[subChannelColIdx].innerText.trim() : '';
                  const rawFareText = subFareColIdx !== -1 && dCells[subFareColIdx] ? dCells[subFareColIdx].innerText.replace(/[^0-9]/g, '') : '';
                  const tFare = rawFareText ? parseFloat(rawFareText) : null;

                  if (tClass && !classes.includes(tClass)) {
                    classes.push(tClass);
                  }
                  if (tType) {
                    const isMstrMiss = passengerName && /mstr|miss/i.test(passengerName);
                    const isUnder300k = tFare === null || tFare < 300000;
                    if (isMstrMiss && isUnder300k) {
                      if (!tType.endsWith('*')) {
                        tType += '*';
                      }
                    }
                    if (!ticketTypes.includes(tType)) {
                      ticketTypes.push(tType);
                    }
                  }
                  
                  ticketList.push({
                    ticketNum: tNum,
                    ticketClass: tClass,
                    ticketType: tType,
                    passengerName: passengerName,
                    channel: tChannel
                  });

                  if (tNum && (tClass || tType || tFare !== null || tChannel)) {
                    const carrier = pnrCarrierMap.get(code) || null;
                    const agCode = getCurrentAgencyCode() || 'SJNTRH';
                    const dateCom = pnrDateMap.get(code) || null;
                    const ticketData = {
                      ticket_number: tNum,
                      pnr_code: code,
                      ticket_type: tType,
                      ticket_class: tClass,
                      carrier: carrier,
                      fare: tFare,
                      channel: tChannel,
                      AGCODE: agCode,
                      DATECOM: dateCom
                    };
                    newTicketsToCache.push(ticketData);

                    // Cập nhật ngay vào cachedTicketsMap cục bộ để tránh bị ghi đè bởi FlightVN
                    const existing = cachedTicketsMap.get(tNum) || {};
                    cachedTicketsMap.set(tNum, {
                      ...existing,
                      ...ticketData
                    });
                  }
                }
              });
              resultsMap.set(code, { ticketList, classes, ticketTypes });

              if (newTicketsToCache.length > 0) {
                if (!window.skyjetExtensionInvalidated) {
                  try {
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                      chrome.runtime.sendMessage({
                        action: 'save_ticket_cache',
                        tickets: newTicketsToCache
                      });
                    }
                  } catch (e) {
                    if (e.message && e.message.includes('Extension context invalidated')) {
                      window.skyjetExtensionInvalidated = true;
                      console.warn('[Skyjet Helper] Extension context invalidated. Caching skipped.');
                    } else {
                      console.warn('[Skyjet Helper] Error sending save_ticket_cache message:', e);
                    }
                  }
                }
              }
            } else {
              resultsMap.set(code, { ticketList: [], classes: [], ticketTypes: [] });
            }
          } else {
            resultsMap.set(code, { ticketList: [], classes: [], ticketTypes: [] });
          }
        } catch (error) {
          console.error('[Skyjet Helper] Error fetching ticket class for order: ' + code, error);
          resultsMap.set(code, { classes: [], ticketTypes: [] });
        } finally {
          clearTimeout(timeoutId);
          ticketCompletedCount++;
          updateProgress();
        }
      })),
      fetchVnaSequentially()
    ]);

  table.skyjetResultsMap = resultsMap;
  table.skyjetVnaResultsMap = vnaResultsMap;
  renderTransactionColumns(table, resultsMap, vnaResultsMap);
  
  // Show the calculator floating button now that data has been fetched successfully
  const calcBtn = document.getElementById('skyjet-calc-popup-btn');
  if (calcBtn) {
    calcBtn.style.display = 'flex';
  }
  } catch (error) {
    console.error('[Skyjet Helper] Lỗi trong tiến trình kiểm tra vé:', error);
  } finally {
    window.skyjetIsAutoFetching = false;
    if (hasLoginError) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Chưa đăng nhập FlightVN (Thử lại)';
      btn.style.backgroundColor = '#dc3545';
      btn.style.borderColor = '#dc3545';
      btn.style.color = '#ffffff';
    } else {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
      btn.style.backgroundColor = '#17a2b8';
      btn.style.borderColor = '#17a2b8';
      btn.style.color = '#ffffff';
    }
  }
}

function renderTransactionColumns(table, resultsMap, vnaResultsMap) {
  const cachedTicketsMap = table.skyjetCachedTicketsMap || new Map();
  const currentHeaders = Array.from(table.querySelectorAll('thead th'));
  let oldTargetClassHeaderIndex = -1;
  let oldTargetTypeHeaderIndex = -1;
  let oldTargetTimeHeaderIndex = -1;
  let oldTargetFareHeaderIndex = -1;
  let oldTargetChannelHeaderIndex = -1;
  let ngayChungTuIdx = -1;
  let giaBanColIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim();
    if (text === 'Hạng vé') {
      oldTargetClassHeaderIndex = i;
    } else if (text === 'Loại vé') {
      oldTargetTypeHeaderIndex = i;
      currentHeaders[i].dataset.skyjetTypeCol = "true";
    } else if (text === 'Thời gian bay') {
      oldTargetTimeHeaderIndex = i;
      currentHeaders[i].dataset.skyjetTimeCol = "true";
    } else if (text === 'Ngày chứng từ' || text === 'ngay chung tu' || text.toLowerCase().includes('ngày ct')) {
      ngayChungTuIdx = i;
    } else if (text === 'Giá bán' || text === 'gia ban') {
      giaBanColIdx = i;
    } else if (text === 'Giá vé' || text === 'gia ve') {
      oldTargetFareHeaderIndex = i;
      currentHeaders[i].dataset.skyjetFareCol = "true";
    } else if (text === 'Kênh' || text === 'Kênh bán' || text === 'Kenh') {
      oldTargetChannelHeaderIndex = i;
      currentHeaders[i].dataset.skyjetChannelCol = "true";
    }
  }

  let soVeColIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim().toLowerCase();
    if (text === 'số vé' || text === 'so ve') {
      soVeColIdx = i;
      break;
    }
  }

  let orderCodeIndex = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim().toLowerCase();
    if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeIndex = i;
      break;
    }
  }
  if (orderCodeIndex === -1) {
    orderCodeIndex = 5;
  }

  let hanhTrinhHeaderIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim().toLowerCase();
    if (text === 'hành trình' || text === 'hanh trinh') {
      hanhTrinhHeaderIdx = i;
      break;
    }
  }

  let targetClassHeaderIndex = oldTargetClassHeaderIndex;
  const theadTr = table.querySelector('thead tr');

  // Thêm / di chuyển cột Giá vé trực tiếp trước cột Giá bán
  if (oldTargetFareHeaderIndex === -1) {
    if (theadTr && giaBanColIdx !== -1 && currentHeaders[giaBanColIdx]) {
      const th = document.createElement('th');
      th.innerText = 'Giá vé';
      th.style.textAlign = 'center';
      th.dataset.skyjetFareCol = "true";
      theadTr.insertBefore(th, currentHeaders[giaBanColIdx]);
    }
  } else {
    if (theadTr && giaBanColIdx !== -1 && currentHeaders[giaBanColIdx]) {
      const th = currentHeaders[oldTargetFareHeaderIndex];
      if (th && th.nextSibling !== currentHeaders[giaBanColIdx]) {
        theadTr.insertBefore(th, currentHeaders[giaBanColIdx]);
      }
    }
  }

  // Thêm cột Loại vé sau cột Ngày chứng từ nếu chưa có
  if (oldTargetTypeHeaderIndex === -1) {
    if (theadTr) {
      const thNgayChungTu = ngayChungTuIdx !== -1 ? currentHeaders[ngayChungTuIdx] : null;
      const th = document.createElement('th');
      th.innerText = 'Loại vé';
      th.style.textAlign = 'center';
      th.dataset.skyjetTypeCol = "true";
      if (thNgayChungTu) {
        theadTr.insertBefore(th, thNgayChungTu.nextSibling);
      } else if (orderCodeIndex !== -1 && currentHeaders[orderCodeIndex]) {
        theadTr.insertBefore(th, currentHeaders[orderCodeIndex]);
      }
    }
  }

  // Thêm cột Kênh sau cột Ngày chứng từ nếu chưa có
  if (oldTargetChannelHeaderIndex === -1) {
    if (theadTr) {
      const thNgayChungTu = ngayChungTuIdx !== -1 ? currentHeaders[ngayChungTuIdx] : null;
      const th = document.createElement('th');
      th.innerText = 'Kênh';
      th.style.textAlign = 'center';
      th.dataset.skyjetChannelCol = "true";
      if (thNgayChungTu) {
        theadTr.insertBefore(th, thNgayChungTu.nextSibling);
      } else if (orderCodeIndex !== -1 && currentHeaders[orderCodeIndex]) {
        theadTr.insertBefore(th, currentHeaders[orderCodeIndex]);
      }
    }
  }

  // Thêm / di chuyển cột Hạng vé
  if (oldTargetClassHeaderIndex === -1) {
    if (theadTr) {
      const th = document.createElement('th');
      th.innerText = 'Hạng vé';
      th.style.textAlign = 'center';
      if (soVeColIdx !== -1 && currentHeaders[soVeColIdx]) {
        theadTr.insertBefore(th, currentHeaders[soVeColIdx].nextSibling);
        targetClassHeaderIndex = soVeColIdx + 1;
      } else {
        theadTr.appendChild(th);
        targetClassHeaderIndex = currentHeaders.length;
      }
    }
  } else {
    if (soVeColIdx !== -1 && oldTargetClassHeaderIndex !== soVeColIdx + 1) {
      const th = currentHeaders[oldTargetClassHeaderIndex];
      if (theadTr && th && currentHeaders[soVeColIdx]) {
        theadTr.insertBefore(th, currentHeaders[soVeColIdx].nextSibling);
        const updatedHeaders = Array.from(table.querySelectorAll('thead th'));
        targetClassHeaderIndex = updatedHeaders.indexOf(th);
      }
    }
  }

  // Thêm / di chuyển cột Thời gian bay trực tiếp sau cột Hành trình
  if (oldTargetTimeHeaderIndex === -1) {
    if (theadTr && hanhTrinhHeaderIdx !== -1 && currentHeaders[hanhTrinhHeaderIdx]) {
      const th = document.createElement('th');
      th.innerText = 'Thời gian bay';
      th.style.textAlign = 'center';
      th.dataset.skyjetTimeCol = "true";
      theadTr.insertBefore(th, currentHeaders[hanhTrinhHeaderIdx].nextSibling);
    }
  } else {
    if (theadTr && hanhTrinhHeaderIdx !== -1 && currentHeaders[hanhTrinhHeaderIdx]) {
      const th = currentHeaders[oldTargetTimeHeaderIndex];
      if (th && th.previousSibling !== currentHeaders[hanhTrinhHeaderIdx]) {
        theadTr.insertBefore(th, currentHeaders[hanhTrinhHeaderIdx].nextSibling);
      }
    }
  }

  const finalRows = Array.from(table.querySelectorAll('tbody tr'));
  finalRows.forEach(row => {
    // Bỏ qua dòng bị ẩn hoặc dòng tổng cộng
    const rowText = row.innerText.toLowerCase();
    if (rowText.includes('tổng cộng') || rowText.includes('cộng') || row.classList.contains('skyjet-auto-summary-row') || row.style.display === 'none' || row.offsetHeight === 0) {
      return;
    }

    const cells = Array.from(row.querySelectorAll('td'));
    const originalHanhTrinhCell = hanhTrinhHeaderIdx !== -1 ? cells[hanhTrinhHeaderIdx] : null;
    const originalGiaBanCell = giaBanColIdx !== -1 ? cells[giaBanColIdx] : null;
    const orderCodeVal = cells[orderCodeIndex]?.innerText?.trim() || '';
    let cleanCode = cells[orderCodeIndex]?.querySelector('.skyjet-btn span')?.innerText?.trim() || orderCodeVal;
    if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();

    const orderCodeCell = cells[orderCodeIndex];
    const soVeCell = soVeColIdx !== -1 ? cells[soVeColIdx] : null;

    // Thiết lập ô Kênh
    let channelCell = row.querySelector('td[data-skyjet-channel-col="true"]');
    if (!channelCell) {
      channelCell = document.createElement('td');
      channelCell.style.textAlign = 'center';
      channelCell.dataset.skyjetChannelCol = "true";
      const cellNgayChungTu = ngayChungTuIdx !== -1 ? cells[ngayChungTuIdx] : null;
      if (cellNgayChungTu) {
        row.insertBefore(channelCell, cellNgayChungTu.nextSibling);
      } else if (orderCodeCell) {
        row.insertBefore(channelCell, orderCodeCell);
      } else {
        row.appendChild(channelCell);
      }
    } else {
      channelCell.dataset.skyjetChannelCol = "true";
    }

    // Thiết lập ô Loại vé
    let typeCell = row.querySelector('td[data-skyjet-type-col="true"]');
    if (!typeCell) {
      typeCell = document.createElement('td');
      typeCell.style.textAlign = 'center';
      typeCell.dataset.skyjetTypeCol = "true";
      if (channelCell) {
        row.insertBefore(typeCell, channelCell.nextSibling);
      } else {
        const cellNgayChungTu = ngayChungTuIdx !== -1 ? cells[ngayChungTuIdx] : null;
        if (cellNgayChungTu) {
          row.insertBefore(typeCell, cellNgayChungTu.nextSibling);
        } else if (orderCodeCell) {
          row.insertBefore(typeCell, orderCodeCell);
        } else {
          row.appendChild(typeCell);
        }
      }
    } else {
      typeCell.dataset.skyjetTypeCol = "true";
    }

    // Thiết lập ô Hạng vé
    let targetCell = null;
    if (oldTargetClassHeaderIndex === -1) {
      targetCell = document.createElement('td');
      targetCell.style.textAlign = 'center';
      if (soVeCell) {
        row.insertBefore(targetCell, soVeCell.nextSibling);
      } else {
        row.appendChild(targetCell);
      }
    } else {
      targetCell = cells[oldTargetClassHeaderIndex];
      if (targetCell) {
        if (soVeCell && targetCell.previousSibling !== soVeCell) {
          row.insertBefore(targetCell, soVeCell.nextSibling);
        }
      } else {
        targetCell = document.createElement('td');
        targetCell.style.textAlign = 'center';
        row.appendChild(targetCell);
      }
    }

    // Thiết lập ô Thời gian bay sau ô Hành trình
    let timeCell = row.querySelector('td[data-skyjet-time-col="true"]');
    if (!timeCell) {
      timeCell = document.createElement('td');
      timeCell.style.textAlign = 'center';
      timeCell.dataset.skyjetTimeCol = "true";
      if (originalHanhTrinhCell) {
        row.insertBefore(timeCell, originalHanhTrinhCell.nextSibling);
      } else {
        row.appendChild(timeCell);
      }
    } else {
      if (originalHanhTrinhCell && timeCell.previousSibling !== originalHanhTrinhCell) {
        row.insertBefore(timeCell, originalHanhTrinhCell.nextSibling);
      }
    }

    // Thiết lập ô Giá vé trước ô Giá bán
    let fareCell = row.querySelector('td[data-skyjet-fare-col="true"]');
    if (!fareCell) {
      fareCell = document.createElement('td');
      fareCell.style.textAlign = 'right';
      fareCell.dataset.skyjetFareCol = "true";
      if (originalGiaBanCell) {
        row.insertBefore(fareCell, originalGiaBanCell);
      } else {
        row.appendChild(fareCell);
      }
    } else {
      if (originalGiaBanCell && fareCell.nextSibling !== originalGiaBanCell) {
        row.insertBefore(fareCell, originalGiaBanCell);
      }
    }

    if (!cleanCode || cleanCode === '0' || cleanCode.length < 3 || cleanCode.includes('Tổng') || cleanCode.includes('TỔNG')) {
      if (soVeCell && (!cleanCode || cleanCode === '0' || cleanCode.length < 3)) {
        const chungTuVal = getChungTuFromRow(row, table);
        if (chungTuVal) {
          soVeCell.innerText = chungTuVal;
          const headers = Array.from(table.querySelectorAll('thead th'));
          const idx = findHeaderIndex(headers, ['chứng từ', 'chung tu']);
          if (idx !== -1 && cells[idx]) {
            cells[idx].innerText = '';
          }
        }
      }
      targetCell.innerHTML = '';
      timeCell.innerHTML = '';
      if (fareCell) fareCell.innerHTML = '';
      if (channelCell) channelCell.innerHTML = '';
      return;
    }

    const resultObj = resultsMap.get(cleanCode) || { ticketList: [], classes: [], ticketTypes: [] };
    let classesList = [];
    let ticketTypesList = [];
    let rowTicketNum = '';
    let channelVal = '';

    if (resultObj) {
      if (soVeCell) {
        rowTicketNum = soVeCell.innerText.trim();
      } else {
        const descColIdx = findHeaderIndex(currentHeaders, [], ['diễn giải', 'nội dung', 'description']);
        if (descColIdx !== -1 && cells[descColIdx]) {
          const descText = cells[descColIdx].innerText.trim();
          const parts = descText.split('-');
          if (parts.length > 0) {
            let result = parts[0].trim();
            for (let i = 1; i < parts.length; i++) {
              const currentPart = parts[i].trim();
              if (currentPart.length < 3) {
                result = result + '-' + currentPart;
              } else {
                break;
              }
            }
            rowTicketNum = result;
          }
        }
      }

      const hasRefundOrExchangeSuffix = (ticket) => {
        if (!ticket) return false;
        const cleaned = ticket
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .replace(/\\+u200[b-dB-D]/gi, '')
          .replace(/\\+ufeff/gi, '')
          .trim();
        const isRefund = /[\-*]H$/i.test(cleaned);
        const isVoid = /[\-*]V$/i.test(cleaned);
        const endsWithSpecial = /[\-*–—_]$/.test(cleaned);
        const hasSpecialSuffix = /[\-*–—_][a-zA-Z0-9]{1,3}$/.test(cleaned);
        const isOther = (endsWithSpecial || hasSpecialSuffix) && !isRefund && !isVoid;
        return isRefund || isVoid || isOther;
      };

      const ticketMatchExact = (t1, t2) => {
        if (!t1 || !t2) return false;
        if (hasRefundOrExchangeSuffix(t1) !== hasRefundOrExchangeSuffix(t2)) return false;
        const n1 = t1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const n2 = t2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return n1 === n2;
      };

      const ticketMatchFuzzy = (t1, t2) => {
        if (!t1 || !t2) return false;
        if (hasRefundOrExchangeSuffix(t1) !== hasRefundOrExchangeSuffix(t2)) return false;
        const n1 = t1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const n2 = t2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return n1.includes(n2) || n2.includes(n1);
      };

      let matchedTicket = null;
      if (rowTicketNum && resultObj.ticketList) {
        matchedTicket = resultObj.ticketList.find(t => ticketMatchExact(t.ticketNum, rowTicketNum));
        if (!matchedTicket) {
          matchedTicket = resultObj.ticketList.find(t => ticketMatchFuzzy(t.ticketNum, rowTicketNum));
        }
      }

      const updatedHeaders3 = Array.from(table.querySelectorAll('thead th'));
      const passengerColIdx = findHeaderIndex(updatedHeaders3, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach', 'khách hàng', 'khach hang']);
      let mainTablePassengerName = '';
      const currentCells3 = Array.from(row.querySelectorAll('td'));
      if (passengerColIdx !== -1 && currentCells3[passengerColIdx]) {
        mainTablePassengerName = currentCells3[passengerColIdx].innerText.trim();
      }

      if (matchedTicket) {
        if (matchedTicket.ticketClass) {
          classesList = [matchedTicket.ticketClass];
        }
        if (matchedTicket.ticketType) {
          let tType = matchedTicket.ticketType;
          const isMstrMiss = (mainTablePassengerName && /mstr|miss/i.test(mainTablePassengerName)) || 
                             (matchedTicket.passengerName && /mstr|miss/i.test(matchedTicket.passengerName));
          const giaBanText = originalGiaBanCell ? originalGiaBanCell.innerText.trim().replace(/[^0-9\-]/g, '') : '';
          const giaBanVal = giaBanText ? parseFloat(giaBanText) : 0;
          const isUnder300k = giaBanVal < 300000;

          if (tType && isMstrMiss && isUnder300k) {
            if (!tType.endsWith('*')) {
              tType += '*';
            }
          } else if (tType && tType.endsWith('*') && (!isMstrMiss || !isUnder300k)) {
            tType = tType.slice(0, -1);
          }
          ticketTypesList = [tType];
        }
        if (matchedTicket.channel) {
          channelVal = matchedTicket.channel;
        }
      } else {
        classesList = resultObj.classes || [];
        ticketTypesList = (resultObj.ticketTypes || []).map(tType => {
          const isMstrMiss = mainTablePassengerName && /mstr|miss/i.test(mainTablePassengerName);
          const giaBanText = originalGiaBanCell ? originalGiaBanCell.innerText.trim().replace(/[^0-9\-]/g, '') : '';
          const giaBanVal = giaBanText ? parseFloat(giaBanText) : 0;
          const isUnder300k = giaBanVal < 300000;

          if (tType) {
            if (isMstrMiss && isUnder300k) {
              if (!tType.endsWith('*')) {
                return tType + '*';
              }
            } else if (tType.endsWith('*') && (!isMstrMiss || !isUnder300k)) {
              return tType.slice(0, -1);
            }
          }
          return tType;
        });
        if (resultObj.ticketList && resultObj.ticketList.length > 0) {
          channelVal = resultObj.ticketList[0].channel || '';
        }
      }

      const isMstrMiss = (mainTablePassengerName && /mstr|miss/i.test(mainTablePassengerName)) || 
                         (matchedTicket && matchedTicket.passengerName && /mstr|miss/i.test(matchedTicket.passengerName));
      const giaBanText = originalGiaBanCell ? originalGiaBanCell.innerText.trim().replace(/[^0-9\-]/g, '') : '';
      const giaBanVal = giaBanText ? parseFloat(giaBanText) : 0;
      const hasBaby = isMstrMiss && (giaBanVal < 300000);

      if (rowTicketNum) {
        const baseType = getTicketClassification(rowTicketNum);
        ticketTypesList = [hasBaby ? baseType + '*' : baseType];
      } else {
        ticketTypesList = [hasBaby ? 'Vé*' : 'Vé'];
      }
    }

    if (channelCell) {
      if (channelVal) {
        let displayChannel = channelVal;
        const upperChannel = channelVal.trim().toUpperCase();
        if (upperChannel === 'PARTNER') {
          displayChannel = 'PAR';
        } else if (upperChannel === 'FLIGHTVN') {
          displayChannel = 'FLI';
        }
        channelCell.innerHTML = `<span class="badge" style="display:inline-block; padding: 3px 6px; font-size: 11px; font-weight: 700; color: #ffffff; background-color: #0d9488; border-radius: 4px; margin: 1px;">${displayChannel}</span>`;
      } else {
        channelCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
      }
    }

    if (classesList.length > 0) {
      targetCell.innerHTML = classesList.map(cls => {
        let bgColor = '#64748b';
        if (cls === 'Y' || cls.startsWith('Y')) bgColor = '#10b981';
        else if (cls === 'C' || cls.startsWith('C') || cls === 'J' || cls.startsWith('J')) bgColor = '#f59e0b';
        else if (cls === 'M' || cls.startsWith('M') || cls === 'L' || cls.startsWith('L') || cls === 'R' || cls.startsWith('R')) bgColor = '#0284c7';
        
        return `<span class="badge" style="display:inline-block; padding: 3px 6px; font-size: 11px; font-weight: 700; color: #ffffff; background-color: ${bgColor}; border-radius: 4px; margin: 1px;">${cls}</span>`;
      }).join(' ');
    } else {
      targetCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
    }

    // Nút kiểm tra không được tác động vào cột loại vé

    // Điền dữ liệu vào ô Thời gian bay
    const chungTuVal = getChungTuFromRow(row, table);
    const itineraryVal = getItineraryFromRow(row, table);
    const airlineId = mapChungTuToAirlineId(chungTuVal);
    let vnaResponse = vnaResultsMap.get(cleanCode) || null;

    if (airlineId && itineraryVal) {
      if (airlineId !== 'VNA' && airlineId !== 'SPA' && airlineId !== 'VIETJET' && airlineId !== 'BAMBOO' && airlineId !== 'VIETRAVEL') {
        timeCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
      } else {
        const passengerName = getPassengerNameFromRow(row, table);
        const nameParts = passengerName.trim().split(/\s+/);
        const lastName = nameParts[0] || '';
        
        const hasVnaData = vnaResponse && vnaResponse.success && vnaResponse.data;
        if (hasVnaData) {
          let vnaData = vnaResponse.data;
          if (typeof vnaData === 'string') {
            try {
              vnaData = JSON.parse(vnaData);
            } catch (e) {
              console.error('Error parsing vnaData string:', e);
            }
          }
          const pairs = getItineraryPairs(itineraryVal);
          const timeStrings = [];
          pairs.forEach((pair, pairIdx) => {
            const depTime = findDepartureTime(vnaData, pair.from, pair.to, pairIdx);
            if (depTime) {
              const formatted = formatFlightTime(depTime);
              if (formatted) {
                timeStrings.push(formatted);
              }
            }
          });
          if (timeStrings.length === 0) {
            const segments = [];
            if (vnaData && vnaData.reservation && vnaData.reservation.originDestinationOptions) {
              vnaData.reservation.originDestinationOptions.forEach(option => {
                if (option.flightSegments) {
                  segments.push(...option.flightSegments);
                }
              });
            }
            segments.forEach(seg => {
              if (seg && seg.departureDateTime) {
                const formatted = formatFlightTime(seg.departureDateTime);
                if (formatted && !timeStrings.includes(formatted)) {
                  timeStrings.push(formatted);
                }
              }
            });
          }
          if (timeStrings.length > 0) {
            timeCell.innerHTML = timeStrings.map(t => `<span style="display:inline-block; font-size: 11px; font-weight: 700; color: #38bdf8; margin: 1px;">${t}</span>`).join(' | ');
          } else {
            timeCell.innerHTML = `<span style="color:#cbd5e1; font-size: 11px;">-</span>`;
          }
        } else {
          const errorText = vnaResponse && vnaResponse.error ? vnaResponse.error : 'Lỗi tải giờ';
          timeCell.innerHTML = `<span style="color:#cbd5e1; font-size: 11px;" title="${errorText}">-</span>`;
        }
      }
    } else {
      timeCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
    }

    const ticketClassification = getTicketClassification(rowTicketNum);
    let rowFare = null;
    const cleanRowTicketNum = rowTicketNum ? rowTicketNum.trim() : '';
    if (cleanRowTicketNum && cleanRowTicketNum !== '-') {
      const cachedTicket = cachedTicketsMap.get(cleanRowTicketNum);
      if (cachedTicket && cachedTicket.fare !== undefined && cachedTicket.fare !== null) {
        rowFare = cachedTicket.fare;
      } else {
        const cleanTkt = cleanRowTicketNum.replace(/[^a-zA-Z0-9]/g, '');
        for (const [key, val] of cachedTicketsMap.entries()) {
          const cleanKey = key.replace(/[^a-zA-Z0-9]/g, '');
          if (cleanKey === cleanTkt && val.fare !== undefined && val.fare !== null) {
            rowFare = val.fare;
            break;
          }
        }
      }
    }
    if (rowFare === null && vnaResponse && vnaResponse.success && vnaResponse.fare !== undefined && vnaResponse.fare !== null) {
      rowFare = vnaResponse.fare;
    }

    if (rowFare !== null && ticketClassification === 'Vé') {
      fareCell.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: #10b981;">${rowFare.toLocaleString('vi-VN')}</span>`;
    } else {
      fareCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
    }
  });

  // Tự động fit chiều ngang các cột trừ tên khách và diễn giải
  const finalHeaders = Array.from(table.querySelectorAll('thead th'));
  finalHeaders.forEach((th, idx) => {
    const text = th.innerText.trim().toLowerCase();
    if (text.includes('tên khách') || text.includes('ten khach') || text.includes('diễn giải') || text.includes('description')) {
      // Giữ nguyên cột co giãn tự do
    } else {
      th.style.whiteSpace = 'nowrap';
      th.style.width = '1%';
    }
  });

  finalRows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    cells.forEach((td, cellIdx) => {
      const headerText = finalHeaders[cellIdx]?.innerText?.trim()?.toLowerCase() || '';
      if (headerText.includes('tên khách') || headerText.includes('ten khach') || headerText.includes('diễn giải') || headerText.includes('description')) {
        let wrapper = td.querySelector('.skyjet-clamp-wrapper');
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'skyjet-clamp-wrapper';
          while (td.firstChild) {
            wrapper.appendChild(td.firstChild);
          }
          td.appendChild(wrapper);
        }
        wrapper.style.display = '-webkit-box';
        wrapper.style.webkitLineClamp = '2';
        wrapper.style.webkitBoxOrient = 'vertical';
        wrapper.style.overflow = 'hidden';
        wrapper.style.textOverflow = 'ellipsis';
        wrapper.style.wordBreak = 'break-word';
        if (!td.title) {
          td.title = wrapper.innerText.trim();
        }
      } else {
        td.style.whiteSpace = 'nowrap';
        td.style.width = '1%';
      }
    });
  });

  ensureChannelColPosition(table);
  ensureTypeColPosition(table);
  ensureHangVePosition(table);
  ensureTimeColPosition(table);
}


function ensureChannelColPosition(table) {
  moveColumnNextTo(
    table,
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'kênh' || txt === 'kenh' || txt === 'channel';
    },
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'ngày chứng từ' || txt === 'ngay chung tu' || txt.toLowerCase().includes('ngày ct');
    }
  );
}


function ensureTypeColPosition(table) {
  moveColumnNextTo(
    table,
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'loại vé' || txt === 'loai ve';
    },
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      const headers = Array.from(table.querySelectorAll('thead th'));
      const hasChannel = headers.some(h => {
        const hTxt = h.innerText.trim().toLowerCase();
        return hTxt === 'kênh' || hTxt === 'kenh' || hTxt === 'channel';
      });
      if (hasChannel) {
        return txt === 'kênh' || txt === 'kenh' || txt === 'channel';
      }
      return txt === 'ngày chứng từ' || txt === 'ngay chung tu' || txt.toLowerCase().includes('ngày ct');
    }
  );
}


function ensureHangVePosition(table) {
  moveColumnNextTo(
    table,
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'hạng vé' || txt === 'hang ve';
    },
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'số vé' || txt === 'so ve';
    }
  );
}

function ensureTimeColPosition(table) {
  moveColumnNextTo(
    table,
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'thời gian bay' && th.dataset.skyjetTimeCol === 'true';
    },
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'hành trình' || txt === 'hanh trinh';
    }
  );
}


function mapChungTuToAirlineId(chungTuVal) {
  if (!chungTuVal) return '';
  const val = chungTuVal.toUpperCase().trim();
  if (val.includes('VNA') || val.includes('VIETNAM') || val.includes('PACIFIC') || val.includes('BL') || val.startsWith('VN')) {
    return 'VNA';
  }
  if (val.includes('VJ') || val.includes('VIETJET') || val.includes('VJC')) {
    return 'VIETJET';
  }
  if (val.includes('QH') || val.includes('BAMBOO')) {
    return 'BAMBOO';
  }
  if (val.includes('VU') || val.includes('VIETRAVEL')) {
    return 'VIETRAVEL';
  }
  if (val.includes('SPA')  || val.includes('9G')) {
    return 'SPA';
  }
  return '';
}

function getChungTuFromRow(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));
  const idx = findHeaderIndex(headers, ['chứng từ', 'chung tu']);
  if (idx !== -1 && cells[idx]) {
    return cells[idx].innerText.trim();
  }
  return '';
}

function getItineraryFromRow(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));
  const idx = findHeaderIndex(headers, ['hành trình', 'hanh trinh']);
  if (idx !== -1 && cells[idx]) {
    return cells[idx].innerText.trim();
  }
  return '';
}

function getItineraryPairs(itin) {
  if (!itin) return [];
  const airports = itin.split('-').map(a => a.trim().toUpperCase()).filter(Boolean);
  const pairs = [];
  for (let i = 0; i < airports.length - 1; i++) {
    pairs.push({ from: airports[i], to: airports[i+1] });
  }
  return pairs;
}

function findDepartureTime(vnaData, from, to, pairIdx = 0) {
  if (!vnaData || !vnaData.reservation) return null;
  const options = vnaData.reservation.originDestinationOptions || [];
  
  // 1. Trước tiên, tìm khớp chính xác đi/đến
  for (const option of options) {
    const segments = option.flightSegments || [];
    for (const segment of segments) {
      if (segment.departureLocationCode === from && segment.arrivalLocationCode === to) {
        return segment.departureDateTime;
      }
    }
  }

  // 2. Nếu không tìm thấy và là hãng 9G/SPA (hoặc thiếu sân bay đi/đến)
  // Gom tất cả các segment lại để check theo chỉ số
  const allSegments = [];
  for (const option of options) {
    allSegments.push(...(option.flightSegments || []));
  }
  if (allSegments[pairIdx]) {
    const seg = allSegments[pairIdx];
    if (!seg.departureLocationCode || !seg.arrivalLocationCode || seg.marketingAirlineCode === '9G') {
      return seg.departureDateTime;
    }
  }

  // 3. Kiểm tra coupons của hành khách
  const passengers = vnaData.reservation.passengers || [];
  for (const passenger of passengers) {
    const coupons = passenger.ticketDocument?.coupons || [];
    for (const coupon of coupons) {
      if (coupon.departureLocationCode === from && coupon.arrivalLocationCode === to) {
        return coupon.departureDateTime;
      }
    }
  }

  // Fallback cuối cùng nếu là 9G và chỉ có 1 segment
  if (allSegments.length === 1 && allSegments[0].marketingAirlineCode === '9G') {
    return allSegments[0].departureDateTime;
  }
  
  return null;
}

function formatFlightTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const dt = new Date(dateTimeStr);
    if (isNaN(dt.getTime())) {
      const match = dateTimeStr.match(/^(d{4})-(d{2})-(d{2})T(d{2}):(d{2})/);
      if (match) {
        return match[4] + ":" + match[5] + " " + match[3] + "/" + match[2] + "/" + match[1];
      }
      return '';
    }
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return hours + ":" + minutes + " " + day + "/" + month + "/" + year;
  } catch (e) {
    return '';
  }
}


function getPassengerNameFromRow(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));

  // 1. Check if there's a column with header containing passenger name keywords
  const passengerColIdx = findHeaderIndex(headers, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach', 'khách hàng', 'khach hang']);
  if (passengerColIdx !== -1 && cells[passengerColIdx]) {
    const name = cells[passengerColIdx].innerText.trim();
    if (name) return name;
  }

  // 2. If not, check the description cell to extract it
  const descColIdx = findHeaderIndex(headers, [], ['diễn giải', 'nội dung', 'description']);
  if (descColIdx !== -1 && cells[descColIdx]) {
    const descText = cells[descColIdx].innerText.trim();
    const orderCodeIndex = findHeaderIndex(headers, [], ['mã đơn hàng', 'đơn hàng', 'mã đh']);
    const orderCodeVal = orderCodeIndex !== -1 ? (cells[orderCodeIndex]?.innerText?.trim() || '') : '';
    let cleanCode = orderCodeIndex !== -1 ? (cells[orderCodeIndex]?.querySelector('.skyjet-btn span')?.innerText?.trim() || orderCodeVal) : orderCodeVal;
    if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
    const hasOrderCode = cleanCode && 
                         cleanCode !== '0' && 
                         cleanCode.length >= 3 && 
                         cleanCode.length <= 10 &&
                         !cleanCode.includes('Tổng') && 
                         !cleanCode.includes('TỔNG') &&
                         !/^(ACB|VCB|BIDV|CTG|TCB|MB|MSB|VIB|VPB|TPB|SHB|EIB|HDB|STB|AGRI|VIETIN)/i.test(cleanCode) &&
                         !orderCodeVal.includes('*');

    if (hasOrderCode) {
      const majorParts = descText.split(' - ').map(p => p.trim());
      if (majorParts.length >= 3) {
        return majorParts.slice(2).join(' - ');
      } else {
        const parts = descText.split('-');
        if (parts.length > 0) {
          let currentIdx = 1;
          for (; currentIdx < parts.length; currentIdx++) {
            const currentPart = parts[currentIdx].trim();
            if (currentPart.length >= 3) {
              break;
            }
          }
          currentIdx++;
          if (currentIdx < parts.length) {
            return parts.slice(currentIdx).map(p => p.trim()).join(' - ');
          }
        }
      }
    } else {
      return descText;
    }
  }
  return '';
}

function decorateLoaiVeWithAsterisk(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));

  const loaiVeColIdx = findHeaderIndex(headers, ['loại vé', 'loai ve']);

  if (loaiVeColIdx === -1 || !cells[loaiVeColIdx]) return;

  const passengerName = getPassengerNameFromRow(row, table);
  const giaBanColIdx = findHeaderIndex(headers, ['giá bán', 'gia ban']);
  const giaBanText = giaBanColIdx !== -1 && cells[giaBanColIdx] ? cells[giaBanColIdx].innerText.trim().replace(/[^0-9\-]/g, '') : '';
  const giaBanVal = giaBanText ? parseFloat(giaBanText) : 0;
  const isBaby = passengerName && /mstr|miss/i.test(passengerName) && (giaBanVal < 300000);

  const cell = cells[loaiVeColIdx];
  const badge = cell.querySelector('.badge, span');
  if (isBaby) {
    if (badge) {
      const txt = badge.innerText.trim();
      if (txt && !txt.endsWith('*')) {
        badge.innerText = txt + '*';
      }
    } else {
      const txt = cell.innerText.trim();
      if (txt && !txt.endsWith('*')) {
        cell.innerText = txt + '*';
      }
    }
  } else {
    if (badge) {
      const txt = badge.innerText.trim();
      if (txt && txt.endsWith('*')) {
        badge.innerText = txt.slice(0, -1);
      }
    } else {
      const txt = cell.innerText.trim();
      if (txt && txt.endsWith('*')) {
        cell.innerText = txt.slice(0, -1);
      }
    }
  }
}

// Hàm chính biến đổi Mã đơn hàng thành nút bấm thông minh

function processTransactionTable() {
  const table = document.getElementById('tableContent');
  if (!table) return;
  
  // Tránh việc lặp đi lặp lại trên cùng một bảng đã xử lý
  if (table.dataset.decoratedBySkyjet) {
    // Tuy nhiên, nếu số lượng tr thay đổi làm mới, vẫn quét lại các ô chưa có nút
    decorateRows(table);
    return;
  }
  table.dataset.decoratedBySkyjet = "true";
  decorateRows(table);
}

function decorateRows(table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  let orderCodeIndex = -1;
  let soVeColIdx = -1;
  
  // Quét động tiêu đề cột để xác định vị trí "Mã đơn hàng" và "Số vé"
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeIndex = i;
    } else if (text === 'số vé' || text === 'so ve') {
      soVeColIdx = i;
    }
  }
  
  // Nếu không quét được tiêu đề, mặc định là cột số 6 (index 5 trong JS)
  if (orderCodeIndex === -1) {
    orderCodeIndex = 5;
  }
  
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    decorateLoaiVeWithAsterisk(row, table);
    const cells = row.querySelectorAll('td');
    if (cells.length > orderCodeIndex) {
      const td = cells[orderCodeIndex];
      const orderCode = td.innerText.trim();

      // Nếu Mã đơn hàng trống, sao chép Chứng từ sang Số vé ngay lập tức
      const isOrderCodeEmpty = !orderCode || orderCode === '0' || orderCode.length < 3;
      if (isOrderCodeEmpty && soVeColIdx !== -1 && cells[soVeColIdx]) {
        const chungTuVal = getChungTuFromRow(row, table);
        if (chungTuVal) {
          cells[soVeColIdx].innerText = chungTuVal;
          const headers = Array.from(table.querySelectorAll('thead th'));
          const idx = findHeaderIndex(headers, ['chứng từ', 'chung tu']);
          if (idx !== -1 && cells[idx]) {
            cells[idx].innerText = '';
          }
        }
      }
      
      // Chỉ gắn nút khi có mã đơn hợp lệ (độ dài >= 3 ký tự, không trống, chưa được chuyển đổi)
      // KHÔNG gắn nút trên trang agent.skyjet.vn theo yêu cầu
      const isAgentPage = window.location.hostname.includes('agent.skyjet.vn');
      if (orderCode && orderCode !== '0' && orderCode.length >= 3 && !td.querySelector('.skyjet-btn') && !isAgentPage) {
        td.innerHTML = ''; // Xoá nội dung text thô ban đầu
        
        const btn = document.createElement('button');
        btn.className = 'skyjet-btn';
        btn.type = 'button';
        btn.innerHTML = '<span>' + orderCode + '</span>';
        btn.title = 'Bấm để tra cứu nhanh thông tin vé của đơn hàng ' + orderCode;
        
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const currentHeaders = Array.from(table.querySelectorAll('thead th'));
          let ticketColIdx = -1;
          let descColIdx = -1;
          for (let i = 0; i < currentHeaders.length; i++) {
            const hText = currentHeaders[i].innerText.trim().toLowerCase();
            if (hText === 'số vé' || hText === 'so ve') {
              ticketColIdx = i;
            } else if (hText.includes('diễn giải') || hText.includes('nội dung') || hText.includes('description') || hText.includes('giao dịch')) {
              descColIdx = i;
            }
          }
          
          let clickedTicketNum = '';
          const rowCells = Array.from(row.querySelectorAll('td'));
          
          if (ticketColIdx !== -1 && rowCells[ticketColIdx]) {
            clickedTicketNum = rowCells[ticketColIdx].innerText.trim();
          } else {
            let descText = '';
            if (descColIdx !== -1 && rowCells[descColIdx]) {
              descText = rowCells[descColIdx].innerText.trim();
            } else {
              let fallbackTicketIdx = -1;
              for (let i = 0; i < currentHeaders.length; i++) {
                const hText = currentHeaders[i].innerText.trim().toLowerCase();
                if (hText.includes('vé') || hText.includes('ticket')) {
                  fallbackTicketIdx = i;
                  break;
                }
              }
              if (fallbackTicketIdx !== -1 && rowCells[fallbackTicketIdx]) {
                descText = rowCells[fallbackTicketIdx].innerText.trim();
              }
            }
            
            if (descText) {
              const parts = descText.split('-');
              if (parts.length > 0) {
                let result = parts[0].trim();
                for (let i = 1; i < parts.length; i++) {
                  const currentPart = parts[i].trim();
                  if (currentPart.length < 3) {
                    result = result + '-' + currentPart;
                  } else {
                    break;
                  }
                }
                clickedTicketNum = result;
              }
            }
          }
          
          fetchOrderData(orderCode, btn, clickedTicketNum);
        });
        
        td.appendChild(btn);
      }
    }
  });
}

// Gọi API ngầm để lấy thông tin chi tiết vé
function fetchOrderData(orderCode, btnElement, clickedTicketNum) {
  const originalHtml = btnElement.innerHTML;
  btnElement.disabled = true;
  btnElement.innerHTML = `
    <span class="skyjet-spinner"></span>
    <span>${orderCode}</span>
  `;
  
  showOrCreateModalLoading(orderCode);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (e) {}
  }, 15000);

  const origin = (window.location.origin && window.location.origin !== 'null' && !window.location.protocol.startsWith('data')) ? window.location.origin : 'https://erp.skyjet.vn';

  fetch(origin + '/OrderReportArea/OrderReport/SearchAllOrder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: 'OrderReferenceId=' + encodeURIComponent(orderCode),
    signal: controller.signal
  })
  .then(response => {
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error('Lỗi máy chủ (' + response.status + ')');
    }
    return response.text();
  })
  .then(htmlText => {
    btnElement.disabled = false;
    btnElement.innerHTML = originalHtml;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const searchTable = doc.querySelector('#gridItem') || doc.querySelector('table');
    
    if (searchTable) {
      const rows = searchTable.querySelectorAll('tbody tr');
      const hasNoData = rows.length === 0 || 
                        (rows.length === 1 && (rows[0].innerText.includes('không có dữ liệu') || rows[0].innerText.includes('Không tìm thấy')));
      
      if (hasNoData) {
        showModalError(orderCode, 'Không tìm thấy dữ liệu vé nào khớp với mã đơn hàng "' + orderCode + '". Vui lòng kiểm tra lại.');
      } else {
        showModalResults(orderCode, searchTable, clickedTicketNum);
      }
    } else {
      const isLoginRedirect = htmlText.includes('LoginArea') || htmlText.includes('Đăng nhập');
      if (isLoginRedirect) {
        showModalError(orderCode, 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng tải lại trang ERP và đăng nhập lại.');
      } else {
        showModalError(orderCode, 'Không tìm thấy bảng kết quả tra cứu. Có thể định dạng ERP đã thay đổi.');
      }
    }
  })
  .catch(error => {
    clearTimeout(timeoutId);
    console.error('Skyjet ERP Helper Error:', error);
    btnElement.disabled = false;
    btnElement.innerHTML = originalHtml;
    const msg = error.name === 'AbortError' ? 'Quá thời gian phản hồi (15s)' : error.message;
    showModalError(orderCode, 'Lỗi kết nối: ' + msg + '. Vui lòng thử lại!');
  });
}

// Helper: Hiển thị hộp thoại Đang Tải
function showOrCreateModalLoading(orderCode) {
  let overlay = document.getElementById('skyjet-modal-overlay');
  if (overlay) overlay.remove();
  
  overlay = document.createElement('div');
  overlay.id = 'skyjet-modal-overlay';
  overlay.className = 'skyjet-modal-overlay';
  
  overlay.innerHTML = `
    <div class="skyjet-modal-container" style="max-width: 480px !important;">
      <div class="skyjet-modal-header">
        <h3 class="skyjet-modal-title">
          <span>Tra cứu: ${orderCode}</span>
        </h3>
        <button type="button" class="skyjet-modal-close-btn">&times;</button>
      </div>
      <div class="skyjet-modal-body" style="text-align: center; padding: 40px !important;">
        <div class="skyjet-spinner" style="width: 32px; height: 32px; border-width: 3px; border-top-color: #12243d; display: inline-block; margin-bottom: 16px;"></div>
        <div style="font-size: 14px; font-weight: 500; color: #495057;">Đang tìm kiếm thông tin vé chạy ngầm...</div>
        <div style="font-size: 11px; color: #888; margin-top: 6px;">Tiến trình này kết nối trực tiếp với Database Skyjet</div>
      </div>
    </div>
`;
  
  overlay.querySelector('.skyjet-modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// Helper: Hiển thị lỗi hoặc thông báo trống
function showModalError(orderCode, message) {
  const overlay = document.getElementById('skyjet-modal-overlay');
  if (!overlay) return;
  
  const container = overlay.querySelector('.skyjet-modal-container');
  container.style.maxWidth = '480px';
  
  overlay.querySelector('.skyjet-modal-body').innerHTML = `
    <div style="text-align: center; padding: 15px 0;">
      <div style="background: #fdf2f2; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e02424" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 6px;">Tra cứu kết quả</div>
      <div style="font-size: 12.5px; color: #6b7280; line-height: 1.5; padding: 0 10px;">${message}</div>
    </div>
`;
  
  let footer = container.querySelector('.skyjet-modal-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'skyjet-modal-footer';
    container.appendChild(footer);
  }
  footer.innerHTML = '<button type="button" class="skyjet-close-modal-btn">Đóng hộp thoại</button>';
  footer.querySelector('.skyjet-close-modal-btn').addEventListener('click', () => overlay.remove());
}

// Helper: Tái cấu trúc và ẩn động các cột có mọi giá trị trùng nhau 100% trong bảng chi tiết
function optimizeHtmlTable(table) {
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  if (rows.length <= 1) return [];
  
  const lastRow = rows[rows.length - 1];
  const hasSummaryRow = lastRow && (lastRow.innerText.toLowerCase().includes('tổng') || lastRow.querySelectorAll('td.text-danger').length > 0 || lastRow.cells.length < 5);
  const dataRows = hasSummaryRow ? rows.slice(0, -1) : rows;
  if (dataRows.length <= 1) return [];
  
  const headRow = table.querySelector('thead tr');
  if (!headRow) return [];
  const colCount = headRow.cells.length;
  
  // Tag columns that are passenger/description/notes so we can style them (e.g. wrap text to 2 lines max)
  for (let c = 0; c < colCount; c++) {
    const headCell = headRow.cells[c];
    if (headCell) {
      const headText = headCell.innerText?.trim()?.toLowerCase() || '';
      if (headText.includes('diễn giải') || headText.includes('hành khách') || headText.includes('tên khách') || headText.includes('ghi chú')) {
        headCell.classList.add('skyjet-col-passenger');
        rows.forEach(tr => {
          if (tr.cells[c]) {
            tr.cells[c].classList.add('skyjet-col-passenger');
          }
        });
      }
    }
  }
  
  const commonCols = [];
  const commonInfo = [];
  
  // Ánh xạ meta labels cho các cột thường gặp của Skyjet ERP jambo_table
  const colMetadata = {
    1: { icon: '🏢', label: 'Đại lý' },
    2: { icon: '🔑', label: 'Mã PNR' },
    4: { icon: '🎟️', label: 'Loại vé' },
    5: { icon: '📦', label: 'Sản phẩm' },
    6: { icon: '🌐', label: 'Kênh bán' },
    7: { icon: '🔢', label: 'Qty' },
    8: { icon: '📍', label: 'Hành trình' },
    9: { icon: '🌎', label: 'ND/QT' },
    10: { icon: '✈️', label: 'Hãng bay' },
    11: { icon: '💺', label: 'Hạng đặt' },
    12: { icon: '🏢', label: 'Nhà cung cấp' },
    13: { icon: '📅', label: 'Ngày xuất' },
    27: { icon: '👥', label: 'ĐL Cấp 2' },
    29: { icon: '👤', label: 'Booker' }
  };
  
  for (let c = 0; c < colCount; c++) {
    // Không bao giờ ẩn các cột quan trọng nhất: STT, Số vé, Diễn giải/Hành khách
    if (c === 0) continue;
    
    const headText = headRow.cells[c]?.innerText?.trim()?.toLowerCase() || '';
    if (headText.includes('số vé') || headText.includes('diễn giải') || headText.includes('ghi chú')) {
      continue;
    }
    
    const values = dataRows.map(row => {
      const cell = row.cells[c];
      return cell ? cell.innerText.trim() : '';
    });
    
    const isNumericString = (str) => {
      if (!str) return false;
      const clean = str.replace(/[., đ%vN]/gi, '').trim();
      if (clean === '') return false;
      return /^-?[0-9]+$/.test(clean);
    };
    const getNumericValue = (str) => {
      if (!str) return 0;
      const clean = str.replace(/[., đ%vN]/gi, '').trim();
      return parseInt(clean, 10) || 0;
    };
    
    // Check if the column is entirely blank OR entirely zero (or mix of empty and zero)
    const isColBlankOrZero = values.every(v => {
      if (!v) return true;
      const clean = v.replace(/[., đ%vN-]/gi, '').trim();
      return clean === '' || clean === '0' || /^0+$/.test(clean);
    });
    
    const firstVal = values[0];
    const isAllSame = values.every(v => v === firstVal);
    
    let shouldOptimize = false;
    let badgeValue = '';
    
    if (isColBlankOrZero) {
      shouldOptimize = true;
      const nonEmptys = values.filter(v => v !== '');
      badgeValue = nonEmptys.length > 0 ? nonEmptys[0] : '0';
    } else if (isAllSame && firstVal !== '') {
      // 2 cột đặc thù: phần trăm VAT và mã Booker không tính là số, nên có thể gộp
      const isPercentVat = headText.includes('%') || headText.includes('phần trăm');
      const isVatAmount = headText.includes('thuế vat') || headText.includes('tiền thuế vat');
      const isExcludedFromNumeric = isPercentVat || headText.includes('booker') || (headText.includes('vat') && !isVatAmount);
      const isNumeric = isNumericString(firstVal) && !isExcludedFromNumeric;
      
      if (!isNumeric) {
        shouldOptimize = true;
        badgeValue = firstVal;
      }
    }
    
    if (shouldOptimize) {
      commonCols.push(c);
      const meta = colMetadata[c] || { icon: '📝', label: headRow.cells[c]?.innerText?.trim() || ('Cột ' + c) };
      commonInfo.push({
        index: c,
        icon: meta.icon,
        label: meta.label,
        value: badgeValue
      });
    }
  }
  
  // Tiến hành xóa các cell của cột trùng lặp để thu gọn bảng
  if (commonCols.length > 0) {
    // Duyệt ngược từ index lớn về nhỏ tránh bị lệch chỉ mục khi xóa
    commonCols.sort((a, b) => b - a);
    
    // Xóa trong thead
    const theadRows = table.querySelectorAll('thead tr');
    theadRows.forEach(tr => {
      commonCols.forEach(c => {
        if (tr.cells[c]) tr.deleteCell(c);
      });
    });
    
    // Xóa trong tfoot (nếu có)
    const tfootRows = table.querySelectorAll('tfoot tr');
    tfootRows.forEach(tr => {
      commonCols.forEach(c => {
        if (tr.cells[c]) tr.deleteCell(c);
      });
    });
    
    // Xóa trong tbody
    rows.forEach(tr => {
      commonCols.forEach(c => {
        if (tr.cells[c]) tr.deleteCell(c);
      });
    });
  }
  
  return commonInfo;
}

// Helper: Tính toán cộng dồn và điền dòng tổng cộng cho toàn bộ cột số trong bảng chi tiết
function addOrUpdateHtmlSummaryRow(table) {
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  if (rows.length === 0) return;
  
  const lastRow = rows[rows.length - 1];
  const hasSummaryRow = lastRow && (lastRow.innerText.toLowerCase().includes('tổng') || lastRow.querySelectorAll('td.text-danger').length > 0 || lastRow.cells.length < 5);
  const dataRows = hasSummaryRow ? rows.slice(0, -1) : rows;
  if (dataRows.length === 0) return;
  
  const headRow = table.querySelector('thead tr');
  if (!headRow) return;
  const colCount = headRow.cells.length;
  
  const isNumericString = (str) => {
    if (!str) return false;
    const clean = str.replace(/[., đ%vN]/gi, '').trim();
    if (clean === '') return false;
    return /^-?[0-9]+$/.test(clean);
  };

  const getNumericValue = (str) => {
    if (!str) return 0;
    const clean = str.replace(/[., đ%vN]/gi, '').trim();
    return parseInt(clean, 10) || 0;
  };
  
  const columnsToSum = [];
  for (let c = 1; c < colCount; c++) {
    const headText = headRow.cells[c]?.innerText?.trim()?.toLowerCase() || '';
    const isVatAmount = headText.includes('thuế vat') || headText.includes('tiền thuế vat');
    const isExcluded = headText.includes('số vé') || 
                       headText.includes('ngày') || 
                       headText.includes('ghi chú') || 
                       headText.includes('stt') || 
                       headText.includes('mã pnr') || 
                       headText.includes('booker') || 
                       headText.includes('%') || 
                       (headText.includes('vat') && !isVatAmount);
    if (isExcluded) {
      continue;
    }
    
    const vals = dataRows.map(row => row.cells[c] ? row.cells[c].innerText.trim() : '');
    const nonEmpties = vals.filter(v => v !== '');
    if (nonEmpties.length === 0) continue;
    
    const allNumeric = nonEmpties.every(v => isNumericString(v));
    if (allNumeric) {
      let sum = 0;
      nonEmpties.forEach(v => {
        sum += getNumericValue(v);
      });
      columnsToSum.push({ index: c, total: sum });
    }
  }
  
  const formatValue = (num, colIdx) => {
    const sampleVal = dataRows.find(r => r.cells[colIdx] && r.cells[colIdx].innerText.trim() !== '')?.cells[colIdx]?.innerText || '';
    if (sampleVal.includes('%')) {
      return num + '%';
    }
    return new Intl.NumberFormat('vi-VN').format(num);
  };
  
  let summaryRowElement;
  if (hasSummaryRow) {
    summaryRowElement = lastRow;
  } else {
    summaryRowElement = document.createElement('tr');
    summaryRowElement.style.fontWeight = 'bold';
    summaryRowElement.style.background = '#f8fafc';
    summaryRowElement.className = 'skyjet-auto-summary-row';
    
    for (let c = 0; c < colCount; c++) {
      const td = document.createElement('td');
      td.style.padding = '10px 8px';
      summaryRowElement.appendChild(td);
    }
    table.querySelector('tbody').appendChild(summaryRowElement);
  }
  
  // Fill values in summary row
  for (let c = 0; c < colCount; c++) {
    const cell = summaryRowElement.cells[c];
    if (!cell) continue;
    
    // Nếu đã có dòng tổng hợp của ERP, ta chỉ cập nhật các cột số tiền cần tính tổng
    if (hasSummaryRow) {
      const sumInfo = columnsToSum.find(item => item.index === c);
      if (sumInfo) {
        cell.innerText = formatValue(sumInfo.total, c);
        cell.style.color = '#10b981';
        cell.style.fontWeight = 'bold';
      }
    } else {
      // Nếu chưa có dòng tổng hợp/mới tinh, ta điền các nhãn và giá trị tổng cộng
      if (c === 0) {
        cell.innerText = '∑';
        cell.style.color = '#1e3a8a';
        cell.style.fontWeight = 'bold';
        cell.style.textAlign = 'center';
      } else if (c === 1) {
        cell.innerText = 'Tổng cộng';
        cell.style.color = '#1e3a8a';
        cell.style.fontWeight = 'bold';
      } else {
        const sumInfo = columnsToSum.find(item => item.index === c);
        if (sumInfo) {
          cell.innerText = formatValue(sumInfo.total, c);
          cell.style.color = '#10b981';
          cell.style.fontWeight = 'bold';
        } else {
          cell.innerText = '';
        }
      }
    }
  }
}

// Helper: Thiết kế bảng thông tin kết quả vé cực kỳ đẹp mắt
function showModalResults(orderCode, parsedTable, clickedTicketNum) {
  const overlay = document.getElementById('skyjet-modal-overlay');
  if (!overlay) return;
  
  // Trích xuất mã PNR từ parsedTable TRƯỚC KHI tối ưu xóa cột trùng lặp
  let extractedPnr = '';
  const detailRowsForPnr = parsedTable.querySelectorAll('tbody tr');
  const subHeadersForPnr = Array.from(parsedTable.querySelectorAll('thead th')).map(th => th.innerText.trim().toLowerCase());
  const pnrIdx = subHeadersForPnr.findIndex(h => h === 'pnr');
  const ticketIdx = subHeadersForPnr.findIndex(h => h === 'số vé' || h === 'so ve' || h.includes('vé') || h.includes('ticket'));

  if (clickedTicketNum) {
    const cleanClicked = clickedTicketNum.replace(/\s+/g, '').toLowerCase();
    for (const dRow of detailRowsForPnr) {
      const cells = Array.from(dRow.cells);
      if (ticketIdx !== -1 && cells[ticketIdx]) {
        const cellText = cells[ticketIdx].innerText.trim().replace(/\s+/g, '').toLowerCase();
        if (cellText === cleanClicked) {
          if (pnrIdx !== -1 && cells[pnrIdx]) {
            extractedPnr = cells[pnrIdx].innerText.trim();
          }
          break;
        }
      }
    }
  }

  if (!extractedPnr && pnrIdx !== -1) {
    for (const dRow of detailRowsForPnr) {
      const cells = Array.from(dRow.cells);
      if (cells[pnrIdx]) {
        const val = cells[pnrIdx].innerText.trim();
        if (val && val !== '0' && val.toLowerCase() !== 'không có' && val.toLowerCase() !== 'no pnr') {
          extractedPnr = val;
          break;
        }
      }
    }
  }

  if (extractedPnr) {
    extractedPnr = extractedPnr.split('*')[0].trim();
  }
  console.log('[Skyjet Helper] Extracted PNR for SearchAllOrder:', extractedPnr);

  const container = overlay.querySelector('.skyjet-modal-container');
  container.removeAttribute('style');
  
  const rows = Array.from(parsedTable.querySelectorAll('tbody tr'));
  let totalAmountStr = '0';
  let ticketCount = rows.length;
  let airlines = [];
  let routes = [];
  
  // Phân tích dữ liệu trong bảng để xuất thống kê thẻ thông minh
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length > 10) {
      const route = cells[8]?.innerText?.trim() || '';
      const air = cells[10]?.innerText?.trim() || '';
      if (route && !routes.includes(route)) routes.push(route);
      if (air && !airlines.includes(air)) airlines.push(air);
    }
  });
  
  // Tính tổng tiền dựa trên dòng cuối (nếu có dòng summary) hoặc cộng dồn thủ công
  const lastRow = rows[rows.length - 1];
  const hasSummaryRow = lastRow && (lastRow.innerText.toLowerCase().includes('tổng') || lastRow.querySelectorAll('td.text-danger').length > 0 || lastRow.cells.length < 5);
  
  if (hasSummaryRow) {
    ticketCount = Math.max(0, ticketCount - 1);
    const cells = Array.from(lastRow.querySelectorAll('td'));
    if (cells.length > 25) {
      totalAmountStr = cells[25]?.innerText?.trim() || '0';
    }
  } else {
    let sum = 0;
    rows.forEach(r => {
      const cells = r.querySelectorAll('td');
      if (cells.length > 25) {
        const valStr = cells[25].innerText.replace(/[^0-9]/g, '');
        sum += parseInt(valStr) || 0;
      }
    });
    totalAmountStr = new Intl.NumberFormat('vi-VN').format(sum);
  }

  // Set width dynamically to avoid massive empty spaces on 1-row ticket modals
  if (ticketCount === 1) {
    container.classList.add('skyjet-modal-single-ticket');
  } else {
    container.classList.remove('skyjet-modal-single-ticket');
  }

  // Đánh dấu nổi bật dòng vé được chọn từ bảng công nợ tương ứng TRƯỚC KHI tối ưu xóa cột
  if (clickedTicketNum) {
    const cleanClicked = clickedTicketNum.replace(/\s+/g, '').toLowerCase();
    
    // Lưu vào biến toàn cục để người dùng debug console
    window.skyjetLastClickedTicket = clickedTicketNum;
    window.skyjetCleanClicked = cleanClicked;
    console.log('[Skyjet Debug] Clicked ticket original/extracted:', clickedTicketNum);
    console.log('[Skyjet Debug] Clicked ticket normalized (target):', cleanClicked);
    
    const detailRows = parsedTable.querySelectorAll('tbody tr');
    detailRows.forEach((dRow, rowIndex) => {
      const cells = Array.from(dRow.cells);
      // Tìm ô chứa số vé
      const numberCell = cells.find((cell, cellIndex) => {
        const cellText = cell.innerText.trim().replace(/\s+/g, '').toLowerCase();
        
        console.log('[Skyjet Debug] Row ' + rowIndex + ' Cell ' + cellIndex + ': text="' + cellText + '" vs target="' + cleanClicked + '" -> ' + (cellText === cleanClicked ? 'MATCH!' : 'NO'));
        // So khớp chính xác tuyệt đối sau khi loại bỏ khoảng trắng
        return cellText === cleanClicked;
      });

      if (numberCell) {
        dRow.classList.add('skyjet-highlighted-row');
        dRow.style.backgroundColor = '#fef3c7'; // Màu nền vàng dịu nhẹ sang trọng
        dRow.style.color = '#1e293b';
        dRow.style.fontWeight = 'bold';
        
        const originalText = numberCell.innerText.trim();
        numberCell.innerHTML = '<span style="color: #b45309; font-weight: 800; font-family: monospace;">' + originalText + '</span>';
      }
    });
  }

  // Tối ưu các giá trị trùng lặp 100% trong bảng chi tiết của Skyjet ERP jambo_table
  const commonColsInfo = optimizeHtmlTable(parsedTable);
  addOrUpdateHtmlSummaryRow(parsedTable);
  
  let commonFieldsHtml = '';
  // Chỉ hiển thị DỮ LIỆU ĐỒNG BỘ CHUNG nếu có từ 2 vé trở lên
  if (ticketCount > 1 && commonColsInfo && commonColsInfo.length > 0) {
    const badges = commonColsInfo.map(meta => {
      return `
        <div class="skyjet-sync-badge">
          <span style="font-size: 12px;">${meta.icon}</span>
          <span class="skyjet-sync-badge-label">${meta.label}:</span>
          <span class="skyjet-sync-badge-value">${meta.value}</span>
        </div>
      `;
    }).join('');
    
    commonFieldsHtml = `
      <div class="skyjet-sync-container">
        <div class="skyjet-sync-header">
          <span style="display: inline-block; width: 6px; height: 6px; background: #22c55e; border-radius: 50%;"></span>
          DỮ LIỆU ĐỒNG BỘ CHUNG (Đã tối ưu ẩn khỏi bảng bên dưới để tránh lặp dư thừa):
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${badges}
        </div>
      </div>
    `;
  }
  
  // RENDER EMBED CONTENT CHẤT LƯỢNG CAO
  let embedHtmlContent = '';
  if (ticketCount === 1) {
    const headRow = parsedTable.querySelector('thead tr');
    const dataRows = hasSummaryRow ? rows.slice(0, -1) : rows;
    const singleRow = dataRows[0];
    const colCount = headRow ? headRow.cells.length : 0;
    
    const infoFields = [];
    const priceFields = [];
    let totalPriceVal = totalAmountStr;
    let supplierPriceVal = '';
    
    if (headRow && singleRow) {
      for (let c = 0; c < colCount; c++) {
        const label = headRow.cells[c]?.innerText?.trim() || "";
        const value = singleRow.cells[c]?.innerText?.trim() || "";
        if (!label || label.toLowerCase() === 'stt' || label === '∑') continue;
        
        const lowerLabel = label.toLowerCase();
        
        if (lowerLabel.includes('tổng tiền') || lowerLabel.includes('tổng thanh toán')) {
          totalPriceVal = value || totalPriceVal;
        } else if (lowerLabel.includes('giá ncc') || lowerLabel.includes('giá net')) {
          supplierPriceVal = value;
        }
        
        const isPriceField = lowerLabel.includes('giá') || 
                             lowerLabel.includes('phí') || 
                             lowerLabel.includes('thuế') || 
                             lowerLabel.includes('vat') || 
                             lowerLabel.includes('tạm tính') || 
                             lowerLabel.includes('phải trả') || 
                             lowerLabel.includes('hoa hồng') || 
                             lowerLabel.includes('tiền');
                             
        const icon = lowerLabel.includes('vé') ? '🎟️' :
                     lowerLabel.includes('pnr') ? '🔑' :
                     (lowerLabel.includes('hướng') || lowerLabel.includes('hành trình')) ? '📍' :
                     lowerLabel.includes('hãng') ? '✈️' :
                     lowerLabel.includes('hạng') ? '💺' :
                     lowerLabel.includes('ngày') ? '📅' :
                     lowerLabel.includes('booker') ? '👥' :
                     lowerLabel.includes('khách') || lowerLabel.includes('diễn giải') || lowerLabel.includes('ghi chú') ? '👤' : '📄';
                     
        const fieldData = { label, value, icon };
        
        if (isPriceField) {
          priceFields.push(fieldData);
        } else {
          infoFields.push(fieldData);
        }
      }
    }
    
    const infoHtml = infoFields.map(f => {
      const isFull = f.label.toLowerCase().includes('khách') || f.label.toLowerCase().includes('diễn giải') || f.label.toLowerCase().includes('ghi chú');
      let displayValue = f.value || '—';
      if (displayValue && typeof displayValue === 'string' && displayValue.includes(' ')) {
        const parts = displayValue.split(' ');
        if (parts.length === 2 && parts[0].includes('/') && parts[1].includes(':')) {
          displayValue = `<div style="text-align: right; line-height: 1.25;"><div>${parts[0]}</div><div style="font-size: 11px; font-weight: normal; color: #64748b; margin-top: 1px;">${parts[1]}</div></div>`;
        }
      }
      return `
        <div class="skyjet-single-card-field ${isFull ? 'skyjet-single-card-field-full' : ''}">
          <span class="skyjet-single-card-field-label">
            <span class="skyjet-single-card-field-icon-bg">${f.icon}</span>
            ${f.label}
          </span>
          <span class="skyjet-single-card-field-value ${f.label.toLowerCase().includes('vé') || f.label.toLowerCase().includes('pnr') ? 'skyjet-single-card-field-value-mono' : ''}">${displayValue}</span>
        </div>
      `;
    }).join('');
    
    const priceHtml = priceFields.filter(f => {
      const lower = f.label.toLowerCase();
      return !lower.includes('tổng tiền') && !lower.includes('tổng thanh toán') && !lower.includes('giá ncc') && !lower.includes('giá net');
    }).map(f => {
      return `
        <div class="skyjet-single-card-field">
          <span class="skyjet-single-card-field-label">
            <span class="skyjet-single-card-field-icon-bg">💰</span>
            ${f.label}
          </span>
          <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono">${f.value || '0'}</span>
        </div>
      `;
    }).join('');
    
    const supplierPriceDiv = supplierPriceVal ? `
      <div style="text-align: right;">
        <span class="skyjet-single-card-field-label" style="color: #0f766e; display: block !important; margin-bottom: 2px !important; text-align: right !important; font-weight: 700 !important; font-size: 10px !important; letter-spacing: 0.5px !important;">Giá Net Nhà Cung Cấp</span>
        <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono" style="color: #0d9488; font-size: 16px !important; font-weight: 800 !important; display: block !important; text-align: right !important;">${supplierPriceVal}</span>
      </div>
    ` : '';
    
    embedHtmlContent = `
      <div class="skyjet-single-row-container">
        <div class="skyjet-single-card-block">
          <div class="skyjet-single-card-header skyjet-single-card-header-blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"></path><path d="M2 21h20"></path><path d="M10 7h4"></path><path d="M10 11h4"></path><path d="M10 15h4"></path></svg>
            Thông tin đặt vé
          </div>
          <div class="skyjet-single-card-grid">
            ${infoHtml}
          </div>
        </div>
        
        <div class="skyjet-single-card-block">
          <div class="skyjet-single-card-header skyjet-single-card-header-green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>
            Tài chính &amp; Thanh toán
          </div>
          <div class="skyjet-single-card-grid">
            ${priceHtml}
            
            <div class="skyjet-single-card-total-box">
              <div style="text-align: left;">
                <span class="skyjet-single-card-field-label" style="color: #047857; display: block !important; margin-bottom: 2px !important; text-align: left !important; font-weight: 700 !important; font-size: 10px !important; letter-spacing: 0.5px !important;">Tổng thanh toán cuối</span>
                <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono" style="color: #059669; font-size: 20px !important; font-weight: 800 !important; display: block !important; text-align: left !important;">${totalPriceVal} <span style="font-size: 12px !important; font-weight: normal !important; text-transform: lowercase; color: #047857 !important;">vnđ</span></span>
              </div>
              ${supplierPriceDiv}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    embedHtmlContent = `
      <div id="skyjet-embed-table" class="skyjet-clean-table-wrapper">
        <!-- Bảng gốc của Skyjet ERP được gắn vào đây -->
      </div>
    `;
  }
  
  const body = overlay.querySelector('.skyjet-modal-body');
  body.removeAttribute('style');
  body.innerHTML = `
    ${commonFieldsHtml}
    
    ${ticketCount > 1 ? `
    <div class="skyjet-modal-section-title">
      <span class="skyjet-modal-section-title-bar"></span>
      Chi tiết báo cáo các vé của đơn hàng:
    </div>
    ` : ''}
    
    ${embedHtmlContent}
  `;
  
  const embedContainer = body.querySelector('#skyjet-embed-table');
  if (embedContainer) {
    embedContainer.appendChild(parsedTable);
    
    parsedTable.removeAttribute('style');
    parsedTable.className = 'table table-striped jambo_table bulk_action';
  }

  let footer = container.querySelector('.skyjet-modal-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'skyjet-modal-footer';
    container.appendChild(footer);
  }
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.alignItems = 'center';
  footer.style.gap = '10px';
  footer.style.flexWrap = 'wrap';

  const pnrParam = extractedPnr ? `&PNR=${encodeURIComponent(extractedPnr)}` : '';
  const ticketParam = clickedTicketNum ? `&TicketNumber=${encodeURIComponent(clickedTicketNum)}` : '';

  footer.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center;">
      <button type="button" data-url="/OrderReportArea/OrderReport/SearchAllOrder?&i=13&OrderReferenceId=${orderCode}${pnrParam}${ticketParam}&skyjet_hide_nav=true" class="skyjet-open-origin-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        Mở đơn hàng gốc
      </button>
      <button type="button" class="skyjet-close-modal-btn">Đóng cửa sổ</button>
    </div>
  `;
  footer.querySelector('.skyjet-close-modal-btn').addEventListener('click', () => overlay.remove());
  const openOriginBtn = footer.querySelector('.skyjet-open-origin-btn');
  if (openOriginBtn) {
    openOriginBtn.addEventListener('click', () => {
      const url = openOriginBtn.getAttribute('data-url');
      const pendingSearchValue = extractedPnr || clickedTicketNum || orderCode;
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({
            'skyjet_pending_search': {
              value: pendingSearchValue,
              timestamp: Date.now()
            }
          });
          console.log('[Skyjet Helper] Stored pending search:', pendingSearchValue);
        } catch (e) {
          console.warn('[Skyjet Helper] Error setting local storage:', e);
        }
      }
      if (url) window.open(url, '_blank');
    });
  }
}


function handleSplitDescription() {
  const table = document.getElementById('tableContent');
  if (!table) return;

  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    if (!chrome.runtime || !chrome.runtime.id) return;

    chrome.storage.local.get(['skyjet_split_desc'], (res) => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
      if (chrome.runtime.lastError) return;

      const active = !!res.skyjet_split_desc;
      if (active) {
        applySplitDescription(table);
      } else {
        revertSplitDescription(table);
      }
    });
  } catch (e) {
    // Ignore context invalidation error
  }
}

function applySplitDescription(table) {
  if (!table.dataset.originalHtml) {
    table.dataset.originalHtml = table.innerHTML;
  }

  function cleanItinerary(s) {
    if (!s) return '';
    let clean = s.trim().toUpperCase();
    clean = clean.replace(/^(VN|VJ|QH|VU|BL|PA)\s+/, '');
    clean = clean.replace(/[^A-Za-z0-9]/g, '');
    if (!clean) return '';

    const segments = [];
    let temp = clean;
    let len = 3;
    while (temp.length > 0) {
      segments.push(temp.substring(0, len));
      temp = temp.substring(len);
      len = (len === 3) ? 2 : 3;
    }

    let fits = true;
    let expectedLen = 3;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].length !== expectedLen) {
        fits = false;
        break;
      }
      expectedLen = (expectedLen === 3) ? 2 : 3;
    }

    if (fits && segments.length > 0) {
      const routeParts = [];
      for (let i = 0; i < segments.length; i += 2) {
        routeParts.push(segments[i]);
      }
      return routeParts.join('-');
    } else {
      const routeParts = [];
      for (let i = 0; i < clean.length; i += 3) {
        routeParts.push(clean.substring(i, i + 3));
      }
      return routeParts.join('-');
    }
  }

  const headers = Array.from(table.querySelectorAll('thead th'));
  let descColIndex = -1;
  let loaiVeColIdx = -1;
  let ngayChungTuIdx = -1;
  let orderCodeIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'diễn giải' || text.includes('nội dung') || text.includes('description')) {
      descColIndex = i;
    } else if (text === 'loại vé' || text === 'loai ve') {
      loaiVeColIdx = i;
    } else if (text === 'ngày chứng từ' || text === 'ngay chung tu' || text.includes('ngày ct')) {
      ngayChungTuIdx = i;
    } else if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeIndex = i;
    }
  }

  if (descColIndex === -1) {
    return;
  }
  if (orderCodeIndex === -1) orderCodeIndex = 5;

  const theadTr = table.querySelector('thead tr');
  if (theadTr) {
    const thDesc = theadTr.cells[descColIndex];
    const thLoaiVe = loaiVeColIdx !== -1 ? theadTr.cells[loaiVeColIdx] : null;
    const thNgayChungTu = ngayChungTuIdx !== -1 ? theadTr.cells[ngayChungTuIdx] : null;

    const thTicket = document.createElement('th');
    thTicket.innerText = 'Số vé';
    thTicket.style.textAlign = 'center';
    
    const thRoute = document.createElement('th');
    thRoute.innerText = 'Hành trình';
    thRoute.style.textAlign = 'center';
    
    const thGuest = document.createElement('th');
    thGuest.innerText = 'Tên khách';
    thGuest.style.textAlign = 'center';
    thGuest.classList.add('skyjet-col-passenger');

    theadTr.insertBefore(thTicket, thDesc);
    theadTr.insertBefore(thRoute, thDesc);
    theadTr.insertBefore(thGuest, thDesc);
    thDesc.remove();

    if (thLoaiVe) {
      thLoaiVe.dataset.skyjetTypeCol = "true";
      if (thNgayChungTu) {
        theadTr.insertBefore(thLoaiVe, thNgayChungTu.nextSibling);
      } else {
        theadTr.insertBefore(thLoaiVe, thRoute);
      }
    } else {
      const thNew = document.createElement('th');
      thNew.innerText = 'Loại vé';
      thNew.style.textAlign = 'center';
      thNew.dataset.skyjetTypeCol = "true";
      if (thNgayChungTu) {
        theadTr.insertBefore(thNew, thNgayChungTu.nextSibling);
      } else {
        theadTr.insertBefore(thNew, thRoute);
      }
    }
  }

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  
  rows.forEach(row => {
    const rowText = row.innerText.toLowerCase();
    if (rowText.includes('tổng cộng') || rowText.includes('cộng') || row.classList.contains('skyjet-auto-summary-row')) {
      return;
    }
    
    if (row.dataset.splitDescProcessed === "true") {
      return;
    }

    const cells = Array.from(row.cells);
    const orderCodeVal = cells[orderCodeIndex]?.innerText?.trim() || '';
    let cleanCode = cells[orderCodeIndex]?.querySelector('.skyjet-btn span')?.innerText?.trim() || orderCodeVal;
    if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
    const hasOrderCode = cleanCode && 
                         cleanCode !== '0' && 
                         cleanCode.length >= 3 && 
                         cleanCode.length <= 10 &&
                         !cleanCode.includes('Tổng') && 
                         !cleanCode.includes('TỔNG') &&
                         !/^(ACB|VCB|BIDV|CTG|TCB|MB|MSB|VIB|VPB|TPB|SHB|EIB|HDB|STB|AGRI|VIETIN)/i.test(cleanCode) &&
                         !orderCodeVal.includes('*');

    const descCell = cells[descColIndex];
    const loaiVeCell = loaiVeColIdx !== -1 ? cells[loaiVeColIdx] : null;
    if (!descCell) return;
    
    const descText = descCell.innerText.trim();

    let ticketNum = '';
    let itinerary = '';
    let guestName = '';

    if (hasOrderCode) {
      const majorParts = descText.split(' - ').map(p => p.trim());
      if (majorParts.length >= 2) {
        ticketNum = majorParts[0];
        itinerary = cleanItinerary(majorParts[1]);
        if (majorParts.length >= 3) {
          guestName = majorParts.slice(2).join(' - ');
        }
      } else {
        const parts = descText.split('-');
        if (parts.length > 0) {
          let ticketParts = [parts[0].trim()];
          let currentIdx = 1;
          for (; currentIdx < parts.length; currentIdx++) {
            const currentPart = parts[currentIdx].trim();
            if (currentPart.length < 3) {
              ticketParts.push(currentPart);
            } else {
              break;
            }
          }
          ticketNum = ticketParts.join('-');
          
          if (currentIdx < parts.length) {
            itinerary = cleanItinerary(parts[currentIdx].trim());
            currentIdx++;
          }
          
          if (currentIdx < parts.length) {
            guestName = parts.slice(currentIdx).map(p => p.trim()).join(' - ');
          }
        }
      }
    } else {
      guestName = descText;
    }

    const tdTicket = document.createElement('td');
    tdTicket.innerText = ticketNum;
    tdTicket.style.textAlign = 'center';
    
    const tdRoute = document.createElement('td');
    tdRoute.innerText = itinerary;
    tdRoute.style.textAlign = 'center';
    
    const tdGuest = document.createElement('td');
    tdGuest.style.textAlign = 'left';
    tdGuest.classList.add('skyjet-col-passenger');
    tdGuest.title = guestName;

    const divWrapper = document.createElement('div');
    divWrapper.innerText = guestName;
    divWrapper.style.display = '-webkit-box';
    divWrapper.style.webkitLineClamp = '2';
    divWrapper.style.webkitBoxOrient = 'vertical';
    divWrapper.style.overflow = 'hidden';
    divWrapper.style.textOverflow = 'ellipsis';
    divWrapper.style.wordBreak = 'break-word';
    tdGuest.appendChild(divWrapper);

    row.insertBefore(tdTicket, descCell);
    row.insertBefore(tdRoute, descCell);
    row.insertBefore(tdGuest, descCell);
    descCell.remove();

    let tdLoaiVe = loaiVeCell;
    if (!tdLoaiVe) {
      tdLoaiVe = document.createElement('td');
      tdLoaiVe.style.textAlign = 'center';
    }
    tdLoaiVe.dataset.skyjetTypeCol = "true";
    const cellNgayChungTu = ngayChungTuIdx !== -1 ? cells[ngayChungTuIdx] : null;
    if (cellNgayChungTu) {
      row.insertBefore(tdLoaiVe, cellNgayChungTu.nextSibling);
    } else {
      row.insertBefore(tdLoaiVe, tdRoute);
    }

    if (ticketNum) {
      let baseType = getTicketClassification(ticketNum);
      if (baseType === 'Vé') {
        const originalText = loaiVeCell ? loaiVeCell.innerText.trim() : '';
        if (originalText && originalText !== '-' && !originalText.includes('*')) {
          baseType = originalText;
        }
      }
      const passengerName = getPassengerNameFromRow(row, table) || guestName;
      const giaBanColIdxSplit = findHeaderIndex(headers, ['giá bán', 'gia ban']);
      const giaBanText = giaBanColIdxSplit !== -1 && cells[giaBanColIdxSplit] ? cells[giaBanColIdxSplit].innerText.trim().replace(/[^0-9\-]/g, '') : '';
      const giaBanVal = giaBanText ? parseFloat(giaBanText) : 0;
      const hasBaby = passengerName && /mstr|miss/i.test(passengerName) && (giaBanVal < 300000);
      const finalType = hasBaby ? baseType + '*' : baseType;

      let bgColor = '#4169e1'; // royalblue
      let textColor = '#ffffff';
      const lowerType = finalType.toLowerCase();

      if (lowerType.startsWith('hoàn') || lowerType.startsWith('hoan')) {
        bgColor = '#dc143c'; // crimson
      } else if (lowerType.startsWith('void')) {
        bgColor = '#ffd700'; // gold
        textColor = '#000000';
      } else if (lowerType.startsWith('đổi') || lowerType.startsWith('doi')) {
        bgColor = '#f59e0b'; // amber/orange
        textColor = '#ffffff';
      } else if (lowerType.startsWith('hành lý') || lowerType.startsWith('hanh ly') || lowerType.startsWith('hành ly') || lowerType.startsWith('hanh lý')) {
        bgColor = '#10b981'; // emerald green
        textColor = '#ffffff';
      } else if (lowerType.startsWith('khác') || lowerType.startsWith('khac')) {
        bgColor = '#808080'; // xám
      }

      tdLoaiVe.innerHTML = `<span class="badge" style="display:inline-block; padding: 3px 6px; font-size: 11px; font-weight: 700; color: ${textColor}; background-color: ${bgColor}; border-radius: 4px; margin: 1px;">${finalType}</span>`;
    } else {
      const originalText = loaiVeCell ? loaiVeCell.innerText.trim() : '';
      if (originalText && originalText !== '-') {
        tdLoaiVe.innerText = originalText;
      } else {
        tdLoaiVe.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
      }
    }

    row.dataset.splitDescProcessed = "true";
    decorateLoaiVeWithAsterisk(row, table);
  });

  table.dataset.splitDescActive = "true";
  ensureTypeColPosition(table);
  ensureHangVePosition(table);
}

function revertSplitDescription(table) {
  if (table.dataset.splitDescActive === "true" && table.dataset.originalHtml) {
    table.innerHTML = table.dataset.originalHtml;
    delete table.dataset.originalHtml;
    delete table.dataset.splitDescActive;
    delete table.dataset.decoratedBySkyjet;
    processTransactionTable();
  }
}
function injectFundLimitInfo() {
  const pElements = Array.from(document.querySelectorAll('p, div, span, td, strong'));
  const targetEl = pElements.find(el => {
    const txt = el.textContent || "";
    if (txt.includes("Phòng vé:") && txt.includes("Mã KH:") && !el.dataset.fundLimitInjected) {
      const hasMatchingChild = Array.from(el.children).some(child => {
        const cTxt = child.textContent || "";
        return cTxt.includes("Phòng vé:") && cTxt.includes("Mã KH:");
      });
      return !hasMatchingChild;
    }
    return false;
  });

  if (!targetEl) return;
  targetEl.dataset.fundLimitInjected = "true";

  const txt = targetEl.textContent || "";
  const codeM = txt.match(/Mã KH:\s*([A-Za-z0-9_]+)/i);
  if (!codeM) return;
  const agentCode = codeM[1].trim();

  const params = new URLSearchParams();
  params.append('pageIndex', '0');
  params.append('pageSize', '100');
  params.append('agentId', agentCode);

  fetch('/DaiLyArea/Daily/SearchMemberList', {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then(r => r.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      function findValueInDoc(parsedDoc) {
        const table = parsedDoc.querySelector('table');
        if (!table) return null;
        
        const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'));
        if (headers.length === 0) return null;

        let codeColIdx = -1;
        let aqColIdx = -1;

        headers.forEach((th, idx) => {
          const text = th.innerText.trim().toLowerCase();
          if (text === 'mã kh' || text === 'mã khách hàng' || text === 'mã đại lý' || text === 'ma kh' || text === 'mã dl' || text.includes('mã')) {
            if (codeColIdx === -1) codeColIdx = idx;
          }
          if (text.includes('aq') || text.includes('cho phép') || text.includes('cho phep') || text === 'aq cho phép') {
            aqColIdx = idx;
          }
        });

        if (aqColIdx === -1) {
          headers.forEach((th, idx) => {
            const text = th.innerText.trim().toLowerCase();
            if (text.includes('aq') || text.includes('cho phép')) {
              aqColIdx = idx;
            }
          });
        }

        if (aqColIdx === -1) return null;

        const rows = Array.from(table.querySelectorAll('tbody tr, tr'));
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length > aqColIdx) {
            let rowMatches = false;
            if (codeColIdx !== -1 && cells.length > codeColIdx) {
              const cellText = cells[codeColIdx].innerText.trim();
              if (cellText === agentCode || cellText.includes(agentCode)) {
                rowMatches = true;
              }
            } else {
              rowMatches = cells.some(cell => cell.innerText.trim() === agentCode);
            }

            if (rowMatches) {
              return cells[aqColIdx].innerText.trim();
            }
          }
        }
        return null;
      }

      const value = findValueInDoc(doc);
      if (value) {
        appendFundLabel(value);
      }
    })
    .catch(err => console.error('[Skyjet Helper] Error fetching fund limit:', err));

  function appendFundLabel(fundValue) {
    // Thay đổi chữ "Phòng vé:" thành "Đại lý:" ở đầu element gốc
    const originalHtml = targetEl.innerHTML;
    if (originalHtml.includes("Phòng vé:")) {
      targetEl.innerHTML = originalHtml.replace("Phòng vé:", "Đại lý:");
    }

    // Làm sạch và định dạng giá trị hạn mức với dấu chấm thay cho dấu phẩy
    const cleanedValue = fundValue.replace(/đ|VNĐ|vnd/gi, '').trim().replace(/,/g, '.');

    // Tạo thẻ span hiển thị Hạn mức
    const span = document.createElement('span');
    span.style.color = '#e11d48'; // Đỏ rose-600
    span.style.fontWeight = 'bold';
    span.style.marginLeft = '8px';
    span.style.padding = '2px 8px';
    span.style.backgroundColor = 'rgba(225, 29, 72, 0.08)';
    span.style.border = '1px solid rgba(225, 29, 72, 0.25)';
    span.style.borderRadius = '4px';
    span.style.fontSize = '12px';
    span.style.display = 'inline-block';
    span.style.verticalAlign = 'middle';
    span.innerText = ` - Hạn mức: ${cleanedValue}`;

    targetEl.appendChild(span);
  }
}

if (window.skyjetHelperInitialized) {
  if (typeof handleSearchTransactionQuery === 'function') handleSearchTransactionQuery();
  if (typeof handleSearchAllOrderQuery === 'function') handleSearchAllOrderQuery();
  if (typeof processTransactionTable === 'function') processTransactionTable();
  if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
  if (typeof handleSplitDescription === 'function') handleSplitDescription();
  
  // Run credit limit info injection
  injectFundLimitInfo();
  setTimeout(injectFundLimitInfo, 500);
  setTimeout(injectFundLimitInfo, 1500);

  // Đăng ký lắng nghe sự kiện khi người dùng click vào nút Tìm kiếm
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[id*="search" i], button[id*="btn" i], input[type="submit"], #searchBtn, #btnSearch, .btn-search');
    if (btn) {
      // Xóa dataset đã đánh dấu trên tất cả các phần tử để injectFundLimitInfo có thể chạy lại cho đại lý mới
      document.querySelectorAll('[data-fund-limit-injected]').forEach(el => {
        delete el.dataset.fundLimitInjected;
      });
      // Kích hoạt lại việc lấy hạn mức sau khi dữ liệu tải lại (AJAX)
      setTimeout(injectFundLimitInfo, 500);
      setTimeout(injectFundLimitInfo, 1500);
    }
  });
}
