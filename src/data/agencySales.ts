import { ExtensionFile } from '../types';

export const agencySalesFile: ExtensionFile = {
  name: 'agency-sales.js',
  path: 'agency-sales.js',
  language: 'javascript',
  description: 'Script xử lý rút gọn chứng từ, ẩn cột mã khách hàng và cột ngày trùng trên trang Bán đại lý.',
  content: `
function processAgencySalesTable() {
  if (window.location.pathname.toLowerCase().includes('/orderreportarea/orderreport/searchallorder')) return;
  const table = document.getElementById('gridItem');
  if (!table) return;
  
  // Check if it's indeed the AgencySales table containing "Mã đại lý"
  const headers = Array.from(table.querySelectorAll('thead th'));
  let agentCodeIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'mã đại lý' || text.includes('mã đại lý') || text.includes('mã dl') || text.includes('mã đại lí')) {
      agentCodeIndex = i;
      break;
    }
  }
  
  if (agentCodeIndex === -1) {
    return; // This gridItem belongs to a different report or page
  }

  // Get date range input value to pass it along
  let fromDate = '';
  let toDate = '';
  const dateInput = document.getElementById('date-send-request') || document.querySelector('.datepicker.date-range') || document.querySelector('.date-range') || document.querySelector('input[name*="date" i]');
  if (dateInput && 'value' in dateInput) {
    const val = (dateInput.value || '').trim();
    const parts = val.split(/\\s*[-~]\\s*/);
    if (parts.length === 2) {
      fromDate = parts[0];
      toDate = parts[1];
    }
  }
  
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length > agentCodeIndex) {
      const td = cells[agentCodeIndex];
      const agentCode = td.innerText.trim();
      
      // Decorate row if valid agent code and not already decorated, not summarizing row
      if (agentCode && agentCode.length >= 3 && !td.querySelector('.skyjet-agent-btn') && !agentCode.includes('Tổng') && !agentCode.includes('TỔNG')) {
        td.innerHTML = ''; // Clear text
        
        const btn = document.createElement('a');
        btn.className = 'skyjet-agent-btn';
        btn.target = '_blank';
        
        let href = '/AgentArea/Agent/SearchTransaction?&i=8&skyjetAgentId=' + encodeURIComponent(agentCode);
        if (fromDate && toDate) {
          href += '&skyjetFromDate=' + encodeURIComponent(fromDate) + '&skyjetToDate=' + encodeURIComponent(toDate);
        }
        href += '&skyjet_hide_nav=true';
        btn.href = href;
        btn.addEventListener('click', (e) => {
          // Allow opening the tab, but prevent table double firing or bubble issues
          e.stopPropagation();
        });
        
        // Apply pristine inline styling to match Skyjet style perfectly
        btn.style.color = '#0284c7';
        btn.style.fontWeight = '700';
        btn.style.textDecoration = 'none';
        btn.style.borderBottom = '1px dashed #0284c7';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.15s ease';
        
        btn.addEventListener('mouseenter', () => {
          btn.style.color = '#0369a1';
          btn.style.borderBottom = '1px solid #0369a1';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.color = '#0284c7';
          btn.style.borderBottom = '1px dashed #0284c7';
        });
        
        btn.innerText = agentCode;
        td.appendChild(btn);
      }
    }
  });
}

function unmergeRowCells(row) {
  if (!row) return;
  const cells = Array.from(row.cells);
  cells.forEach(cell => {
    const colspan = parseInt(cell.getAttribute('colspan'), 10) || 1;
    if (colspan > 1) {
      cell.removeAttribute('colspan');
      let currentRef = cell;
      for (let i = 1; i < colspan; i++) {
        const newCell = document.createElement(cell.tagName);
        newCell.innerHTML = '';
        row.insertBefore(newCell, currentRef.nextSibling);
        currentRef = newCell;
      }
    }
  });
}

function adjustTableColspansAndVisibility(table, hiddenIndices) {
  const allRows = Array.from(table.querySelectorAll('thead tr, tbody tr, tfoot tr, tr'));
  allRows.forEach(row => {
    unmergeRowCells(row);
    Array.from(row.cells).forEach((cell, idx) => {
      if (hiddenIndices.has(idx)) {
        cell.style.display = 'none';
      } else {
        cell.style.display = '';
      }
    });
  });
}

// Tự động xoá cột "Mã KH" khỏi bảng tra cứu công nợ theo yêu cầu của người dùng
function removeCustomerCodeColumn() {
  if (window.location.pathname.includes('/DaiLyArea/Daily/MemberList') || window.location.href.includes('DaiLyArea/Daily/MemberList')) {
    return;
  }
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'));
    let colIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].innerText.trim().toLowerCase();
      if (text === 'mã kh' || text === 'mã khách hàng' || text === 'ma kh') {
        colIndex = i;
        break;
      }
    }
    if (colIndex !== -1) {
      if (!table.skyjetHiddenIndices) {
        table.skyjetHiddenIndices = new Set();
      }
      table.skyjetHiddenIndices.add(colIndex);
      adjustTableColspansAndVisibility(table, table.skyjetHiddenIndices);
    }
  });
}

// Ẩn cột Ngày xuất nếu tất cả các dòng đều có Ngày xuất trùng với Ngày chứng từ (coi 1900/rỗng là bằng Ngày chứng từ)
function hideDuplicateDates() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return;
    const headers = Array.from(headerRow.cells || headerRow.querySelectorAll('th, td'));
    let docDateIdx = -1;
    let issueDateIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].innerText.trim().toLowerCase();
      if (text === 'ngày chứng từ' || text === 'ngày ct' || text === 'ngày hạch toán' || text === 'ngày lập') {
        docDateIdx = i;
      }
      if (text === 'ngày xuất' || text === 'ngày xuất vé' || text === 'ngày xuất hđ') {
        issueDateIdx = i;
      }
    }
    
    if (docDateIdx !== -1 && issueDateIdx !== -1) {
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const dataRows = rows.filter(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length <= Math.max(docDateIdx, issueDateIdx)) return false;
        const text = row.innerText.toLowerCase();
        return !text.includes('tổng') && !text.includes('cộng') && cells[docDateIdx].innerText.trim() !== '';
      });
      
      if (dataRows.length === 0) return;
      
      let allIdentical = true;
      for (const row of dataRows) {
        const cells = row.querySelectorAll('td');
        const d = cells[docDateIdx].innerText.trim();
        let i = cells[issueDateIdx].innerText.trim();
        
        if (!i || i === '01/01/1900' || i.includes('1900')) {
          i = d;
        }
        
        if (d !== i) {
          allIdentical = false;
          break;
        }
      }
      
      if (!table.skyjetHiddenIndices) {
        table.skyjetHiddenIndices = new Set();
      }
      
      if (allIdentical) {
        table.skyjetHiddenIndices.add(issueDateIdx);
      } else {
        table.skyjetHiddenIndices.delete(issueDateIdx);
        
        // Trả lại giá trị hiển thị cho ngày xuất nếu không ẩn
        rows.forEach(tr => {
          const cells = tr.querySelectorAll('td');
          if (cells.length > issueDateIdx && cells.length > docDateIdx) {
            let i = cells[issueDateIdx].innerText.trim();
            if (!i || i === '01/01/1900' || i.includes('1900')) {
              const d = cells[docDateIdx].innerText.trim();
              cells[issueDateIdx].innerText = d;
            }
          }
        });
      }
      
      adjustTableColspansAndVisibility(table, table.skyjetHiddenIndices);
    }
  });
}

// Rút gọn cột Chứng từ nếu ngày trong Chứng từ trùng với Ngày chứng từ

function shortenDocumentPrefix() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return;
    const headers = Array.from(headerRow.cells || headerRow.querySelectorAll('th, td'));
    let docTypeIdx = -1;
    let docDateIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].innerText.replace(/\\s+/g, ' ').trim().toLowerCase();
      if (text.includes('ngày chứng từ') || text.includes('ngày ct') || text.includes('ngày hạch toán') || text.includes('ngày lập')) {
        docDateIdx = i;
      } else if (text === 'chứng từ' || text === 'chung tu' || text.includes('chứng từ') || text.includes('chung tu') || text === 'loại ct' || text === 'mã ct') {
        docTypeIdx = i;
      }
    }

    if (docTypeIdx !== -1 && docDateIdx !== -1) {
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > Math.max(docTypeIdx, docDateIdx)) {
          const docTypeCell = cells[docTypeIdx];
          const docDateCell = cells[docDateIdx];
          
          const docTypeText = docTypeCell.innerText.replace(/[\\s\\u00a0]+/g, ' ').trim();
          const docDateText = docDateCell.innerText.replace(/[\\s\\u00a0]+/g, ' ').trim();
          
          if (docTypeText && docDateText) {
            // Tìm định dạng ngày YYYY-MM-XX trong Chứng từ (chấp nhận chữ/số cho ngày để bắt lỗi gõ sai như T3)
            const dateMatch = docTypeText.match(/\\d{4}-\\d{2}-[a-zA-Z0-9]{2}/);
            if (dateMatch) {
              const docTypeDateStr = dateMatch[0]; // Ví dụ: "2026-06-13" hoặc "2026-06-T3"
              // Chuyển sang định dạng DD/MM/YYYY để so khớp với Ngày chứng từ
              const parts = docTypeDateStr.split('-');
              const day = parts[2].replace(/T/i, '1'); // Chuẩn hóa chữ T (ví dụ T3 -> 13)
              const convertedDate = day + '/' + parts[1] + '/' + parts[0];
              if (docDateText.includes(convertedDate)) {
                // Thay thế phần ngày trong tất cả text nodes của ô Chứng từ
                const walker = document.createTreeWalker(docTypeCell, NodeFilter.SHOW_TEXT, null);
                let node;
                while (node = walker.nextNode()) {
                  if (node.nodeValue.includes(docTypeDateStr)) {
                    node.nodeValue = node.nodeValue.replace(docTypeDateStr, '').trim();
                  }
                }
              }
            }
          }
        }
      });
    }
  });
}

if (window.skyjetHelperInitialized) {
  if (typeof processAgencySalesTable === 'function') processAgencySalesTable();
  if (typeof removeCustomerCodeColumn === 'function') removeCustomerCodeColumn();
  if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
  if (typeof shortenDocumentPrefix === 'function') shortenDocumentPrefix();
}

// Tự động điền và bấm tìm kiếm khi có tham số skyjetAutoSearch được chuyển hướng đến từ báo cáo công nợ
`
};
