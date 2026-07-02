import { ExtensionFile } from '../types';

export const importBookingFile: ExtensionFile = {
  name: 'import-booking.js',
  path: 'import-booking.js',
  language: 'javascript',
  description: 'Script tự động điền và kích hoạt tìm kiếm nhanh trên trang FlightVN.',
  content: `function handleAutoSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  // Có thể tìm theo skyjetAutoSearch, TicketNumber, hoặc OrderReferenceId làm từ khóa tự động tra cứu từ đầu
  const autoSearchVal = urlParams.get('skyjetAutoSearch') || urlParams.get('TicketNumber') || urlParams.get('OrderReferenceId') || urlParams.get('pnr') || urlParams.get('code') || urlParams.get('RecordLocation');
  if (!autoSearchVal) return;

  // Xử lý một lần duy nhất, xoá các tham số tìm kiếm tự động để tránh lặp vô hạn khi khách tải lại trang thủ công
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + 
    window.location.search
      .replace(/[?&]skyjetAutoSearch=[^&]+/, '')
      .replace(/[?&]TicketNumber=[^&]+/, '')
      .replace(/[?&]OrderReferenceId=[^&]+/, '')
      .replace(/[?&]pnr=[^&]+/, '')
      .replace(/[?&]code=[^&]+/, '')
      .replace(/[?&]RecordLocation=[^&]+/, '')
      .replace(/^&/, '?')
      .replace(/[?]$/, '');
  
  try {
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  } catch (e) {
    console.warn('[Skyjet Helper] Failed to replace state (possibly in data URI or sandboxed environment):', e);
  }

  const performSearch = () => {
    // Tìm ô nhập Số vé/PNR dựa vào placeholder tiếng Việt hoặc ID/name phổ quát
    let input = document.querySelector('input[placeholder*="Số vé"], input[placeholder*="PNR"], input[placeholder*="pnr"], #TicketNumber, #TicketNo, #searchKey, #SearchKey, input[name*="val"], input[name*="search"], input[name*="Ticket"], #record-location, input[name="RecordLocation"], #recordlocation-to-open');
    
    if (!input) {
      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      input = allInputs.find(inp => {
        const ph = (inp.placeholder || '').toLowerCase();
        return ph.includes('số vé') || ph.includes('pnr') || ph.includes('nhập') || ph.includes('vé');
      }) || allInputs[0];
    }

    if (input) {
      input.value = autoSearchVal;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Tìm nút bấm "Tìm Kiếm" hoặc "Tìm kiếm"
      let btn = document.getElementById('btn-search-booking') || document.querySelector('#btn-search-booking');
      if (!btn) {
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn'));
        btn = buttons.find(b => {
          const txt = (b.innerText || b.value || '').trim().toLowerCase();
          return txt.includes('tìm kiếm') || txt.includes('tra cứu') || txt.includes('search');
        });
      }

      if (btn) {
        setTimeout(() => {
          btn.click();
        }, 500);
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performSearch);
  } else {
    setTimeout(performSearch, 400);
  }
}

if (window.skyjetHelperInitialized) {
  if (typeof handleAutoSearchQuery === 'function') handleAutoSearchQuery();
}

// Tự động thêm nút "Kiểm tra" vào trang tìm kiếm giao dịch công nợ
`
};
