const fs = require('fs');

let content = fs.readFileSync('src/data.ts', 'utf8');

const startKey = 'function showModalResults(orderCode, parsedTable, clickedTicketNum) {';
const endKey = 'function getLoggedInStaffCode() {';

const startIdx = content.indexOf(startKey);
const endIdx = content.indexOf(endKey);

if (startIdx === -1 || endIdx === -1) {
  console.error(`Error: startIdx=${startIdx}, endIdx=${endIdx}`);
  process.exit(1);
}

const newShowModalResults = `function showModalResults(orderCode, parsedTable, clickedTicketNum) {
  const overlay = document.getElementById('skyjet-modal-overlay');
  if (!overlay) return;
  
  const container = overlay.querySelector('.skyjet-modal-container');
  container.style.maxWidth = '1400px';
  container.style.width = '95%';
  
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

  // Đánh dấu nổi bật dòng vé được chọn từ bảng công nợ tương ứng TRƯỚC KHI tối ưu xóa cột
  if (clickedTicketNum) {
    const cleanClicked = clickedTicketNum.replace(/\\s+/g, '').toLowerCase();
    
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
        const cellText = cell.innerText.trim().replace(/\\s+/g, '').toLowerCase();
        
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
      return \`
        <div style="display: inline-flex; align-items: center; gap: 4.5px; font-size: 11px; background: #ffffff; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; font-weight: 600; color: #334155; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin-bottom: 2px;">
          <span style="font-size: 12px;">\\\${meta.icon}</span>
          <span style="color: #64748b; font-weight: 400;">\\\${meta.label}:</span>
          <span style="font-weight: 700; color: #12243d;">\\\${meta.value}</span>
        </div>
      \`;
    }).join('');
    
    commonFieldsHtml = \`
      <div style="background: #f0f4f8; border: 1px solid #d1dbed; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; box-sizing: border-box;">
        <div style="font-size: 9.5px; color: #2a3f54; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
          <span style="display: inline-block; width: 6px; height: 6px; background: #22c55e; border-radius: 50%;"></span>
          DỮ LIỆU ĐỒNG BỘ CHUNG (Đã tối ưu ẩn khỏi bảng bên dưới để tránh lặp dư thừa):
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          \\\${badges}
        </div>
      </div>
    \`;
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
      return \`
        <div class="skyjet-single-card-field \\\${isFull ? 'skyjet-single-card-field-full' : ''}">
          <span class="skyjet-single-card-field-label">\\\${f.icon} \\\${f.label}</span>
          <span class="skyjet-single-card-field-value \\\${f.label.toLowerCase().includes('vé') || f.label.toLowerCase().includes('pnr') ? 'skyjet-single-card-field-value-mono' : ''}">\\\${f.value || '—'}</span>
        </div>
      \`;
    }).join('');
    
    const priceHtml = priceFields.filter(f => {
      const lower = f.label.toLowerCase();
      return !lower.includes('tổng tiền') && !lower.includes('tổng thanh toán') && !lower.includes('giá ncc') && !lower.includes('giá net');
    }).map(f => {
      return \`
        <div class="skyjet-single-card-field">
          <span class="skyjet-single-card-field-label">💰 \\\${f.label}</span>
          <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono">\\\${f.value || '0'}</span>
        </div>
      \`;
    }).join('');
    
    const supplierPriceDiv = supplierPriceVal ? \`
      <div style="text-align: right;">
        <span class="skyjet-single-card-field-label" style="color: #64748b; display: block !important; margin-bottom: 2px !important; text-align: right !important;">Giá Net Nhà Cung Cấp</span>
        <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono" style="color: #475569; font-size: 13px !important; display: block !important; text-align: right !important;">\\\${supplierPriceVal}</span>
      </div>
    \` : '';
    
    embedHtmlContent = \`
      <div class="skyjet-single-row-container">
        <div class="skyjet-single-card-block">
          <div class="skyjet-single-card-header" style="color: #1a56db; font-size: 12px !important;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"></path><path d="M2 21h20"></path><path d="M10 7h4"></path><path d="M10 11h4"></path><path d="M10 15h4"></path></svg>
            Thông tin đặt vé
          </div>
          <div class="skyjet-single-card-grid">
            \\\${infoHtml}
          </div>
        </div>
        
        <div class="skyjet-single-card-block">
          <div class="skyjet-single-card-header" style="color: #10b981; font-size: 12px !important;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>
            Tài chính &amp; Thanh toán
          </div>
          <div class="skyjet-single-card-grid">
            \\\${priceHtml}
            
            <div class="skyjet-single-card-total-box">
              <div style="text-align: left;">
                <span class="skyjet-single-card-field-label" style="color: #047857; display: block !important; margin-bottom: 2px !important; text-align: left !important;">Tổng thanh toán cuối</span>
                <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono" style="color: #10b981; font-size: 16px !important; font-weight: 800 !important; display: block !important; text-align: left !important;">\\\${totalPriceVal} <span style="font-size: 11px !important; font-weight: normal !important; text-transform: lowercase;">vnđ</span></span>
              </div>
              \\\${supplierPriceDiv}
            </div>
          </div>
        </div>
      </div>
    \`;
  } else {
    embedHtmlContent = \`
      <div id="skyjet-embed-table" class="skyjet-clean-table-wrapper">
        <!-- Bảng gốc của Skyjet ERP được gắn vào đây -->
      </div>
    \`;
  }
  
  const body = overlay.querySelector('.skyjet-modal-body');
  body.innerHTML = \`
    \\\${commonFieldsHtml}
    
    <div style="font-weight: 700; font-size: 13.5px; margin-top: 5px; margin-bottom: 12px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
      <span style="background: #2a3f54; width: 6px; height: 14px; display: inline-block; border-radius: 2px;"></span>
      \\\${ticketCount === 1 ? 'Báo cáo chi tiết vé đơn hàng (Tối ưu dạng thẻ gọn):' : 'Chi tiết báo cáo các vé của đơn hàng:'}
    </div>
    
    \\\${embedHtmlContent}
  \sub_placeholder_2
  
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
  footer.style.justifyContent = 'center';
  footer.style.alignItems = 'center';
  footer.style.gap = '10px';
  footer.style.flexWrap = 'wrap';

  footer.innerHTML = \`
    <div style="display: flex; gap: 8px; align-items: center; justify-content: center; width: 100%;">
      <a href="/OrderReportArea/OrderReport/SearchAllOrder?&i=13&OrderReferenceId=\\\${orderCode}\\\${clickedTicketNum ? \\\`&TicketNumber=\\\${clickedTicketNum}\\\` : ''}&skyjet_hide_nav=true" target="_blank" class="skyjet-open-origin-btn" style="text-decoration: none; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 6px; background: #0284c7; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: background 0.15s; border: none; cursor: pointer; height: 32px; box-sizing: border-box; line-height: 1;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        Mở đơn hàng gốc
      </a>
      <button type="button" class="skyjet-close-modal-btn" style="display: inline-flex; align-items: center; justify-content: center; height: 32px; box-sizing: border-box; padding: 7px 16px !important; line-height: 1;">Đóng cửa sổ</button>
    </div>
  \`;
  footer.querySelector('.skyjet-close-modal-btn').addEventListener('click', () => overlay.remove());
}`;

const finalShowModalResults = newShowModalResults.replace('sub_placeholder_2', '`');

content = content.slice(0, startIdx) + finalShowModalResults + content.slice(endIdx);

fs.writeFileSync('src/data.ts', content, 'utf8');
console.log('Successfully cleaned src/data.ts');
