import { ExtensionFile } from '../types';

export const mainWorldFile: ExtensionFile = {
  name: 'main-world.js',
  path: 'main-world.js',
  language: 'javascript',
  description: 'Script chạy trong MAIN world để tương tác trực tiếp với các thư viện của trang (ví dụ Flatpickr).',
  content: `// main-world.js
(function() {
  const currentPath = window.location.pathname.toLowerCase();

  // 1. Xử lý xóa/tự động xác nhận popup trên trang RegisterMember khi bấm Đăng ký
  if (currentPath.includes('/kythuatarea/kythuat/registermember') || currentPath.includes('/registermember')) {
    console.log('[Skyjet Main World] Auto-suppressing popups on RegisterMember page.');
    
    // Tự động bỏ qua confirm popup
    window.confirm = function(msg) {
      console.log('[Skyjet Helper] Suppressed confirm popup:', msg);
      return true;
    };

    // Tự động bỏ qua alert popup
    window.alert = function(msg) {
      console.log('[Skyjet Helper] Suppressed alert popup:', msg);
      return true;
    };

    // Chặn SweetAlert nếu có
    if (typeof window.swal === 'function') {
      window.swal = function(...args) {
        console.log('[Skyjet Helper] Suppressed swal popup:', args);
        return Promise.resolve(true);
      };
    }
  }

  // 2. Xử lý gán ngày cho InvoiceRequest
  if (!currentPath.includes('/invoicerequest/create')) return;

  const urlParams = new URLSearchParams(window.location.search);
  const fromDateVal = urlParams.get('skyjetFromDate');
  
  if (!fromDateVal) return;

  console.log('[Skyjet Main World] Setting up date population for:', fromDateVal);

  function convertToYmd(dateStr) {
    if (!dateStr) return '';
    const clean = dateStr.trim();
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(clean)) return clean;
    const dmyMatch = clean.match(/^(\\d{1,2})\\D+(\\d{1,2})\\D+(\\d{4})$/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      return \`\${y}-\${m}-\${d}\`;
    }
    return '';
  }

  const ymdDate = convertToYmd(fromDateVal);
  if (!ymdDate) return;

  let attempts = 0;
  const maxAttempts = 35; // 3.5 seconds

  function setDate() {
    attempts++;
    const fromDateInput = document.getElementById('from-date') || 
                          document.querySelector('input[name*="from" i], input[id*="from" i]');
    if (fromDateInput) {
      if (fromDateInput._flatpickr) {
        fromDateInput._flatpickr.setDate(ymdDate, true);
        console.log('[Skyjet Main World] Successfully set date to:', ymdDate);
      } else {
        const isDateType = fromDateInput.type === 'date';
        fromDateInput.value = isDateType ? ymdDate : fromDateVal;
        fromDateInput.dispatchEvent(new Event('input', { bubbles: true }));
        fromDateInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Skyjet Main World] Set date using raw input fallback.');
      }
    }
    
    if (attempts < maxAttempts) {
      setTimeout(setDate, 100);
    }
  }

  setDate();
})();

`
};
