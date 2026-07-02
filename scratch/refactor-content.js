const fs = require('fs');
const path = require('path');

const contentJsPath = 'd:/remix_-skyjet-erp-extension-helper/scratch/extracted/content.js';
let code = fs.readFileSync(contentJsPath, 'utf8');

// 1. Thay thế logic thu gọn menu (sidebar collapse) bằng cách dùng hàm dùng chung collapseLeftSidebar
const tryHideBlockOld = `    const tryHide = () => {
      const toggleBtn = document.getElementById('menu_toggle') || document.querySelector('.menu_toggle');
      if (toggleBtn) {
        const isExpanded = document.body.classList.contains('nav-md') || !document.body.classList.contains('nav-sm');
        if (isExpanded) {
          toggleBtn.click();
        }
      }
      document.body.classList.remove('nav-md');
      document.body.classList.add('nav-sm');
    };`;

const tryHideBlockNew = `    const tryHide = collapseLeftSidebar;`;

code = code.replace(tryHideBlockOld, tryHideBlockNew);

const tryHideBlockOld2 = `        const tryHide = () => {
          const toggleBtn = document.getElementById('menu_toggle') || document.querySelector('.menu_toggle');
          if (toggleBtn) {
            const isExpanded = document.body.classList.contains('nav-md') || !document.body.classList.contains('nav-sm');
            if (isExpanded) {
              toggleBtn.click();
            }
          }
          document.body.classList.remove('nav-md');
          document.body.classList.add('nav-sm');
        };`;

code = code.replace(tryHideBlockOld2, tryHideBlockNew);

const toggleBtnOld3 = `              const toggleBtn = document.getElementById('menu_toggle') || document.querySelector('.menu_toggle');
              if (toggleBtn) {
                const isExpanded = document.body.classList.contains('nav-md') || !document.body.classList.contains('nav-sm');
                if (isExpanded) {
                  toggleBtn.click();
                }
              }`;

code = code.replace(toggleBtnOld3, `              collapseLeftSidebar();`);

console.log('Finished sidebar collapse refactoring calls.');

// 2. Xóa các cuộc gọi clearDefaultDates(); và autoFillStaffCode(); trong initSkyjetHelper
code = code.replace(/\n\s*clearDefaultDates\(\);/g, '');
code = code.replace(/\n\s*autoFillStaffCode\(\);/g, '');

console.log('Removed clearDefaultDates and autoFillStaffCode calls.');

// 3. Xóa định nghĩa clearDefaultDates
const clearStartIdx = code.indexOf('// Tự động xoá/bỏ trống các ô có giá trị mặc định là 01/01/1900');
if (clearStartIdx !== -1) {
  const clearEndIdx = code.indexOf('// Ẩn cột Ngày xuất nếu tất cả các dòng đều có Ngày xuất trùng với Ngày chứng từ');
  if (clearEndIdx !== -1) {
    code = code.substring(0, clearStartIdx) + code.substring(clearEndIdx);
    console.log('Removed clearDefaultDates definition.');
  } else {
    console.error('Could not find clearEndIdx!');
  }
} else {
  console.error('Could not find clearStartIdx!');
}

// 4. Xóa định nghĩa getLoggedInStaffCode, findNvkdSelect, autoFillStaffCode
const staffStartIdx = code.indexOf('// Tự động điền mã nhân viên đăng nhập vào ô Chọn NVKD');
if (staffStartIdx !== -1) {
  const staffEndIdx = code.indexOf('function handleSplitDescription()');
  if (staffEndIdx !== -1) {
    code = code.substring(0, staffStartIdx) + code.substring(staffEndIdx);
    console.log('Removed staff auto-fill functions definition.');
  } else {
    console.error('Could not find staffEndIdx!');
  }
} else {
  console.error('Could not find staffStartIdx!');
}

// 5. Xóa định nghĩa ensureHangVePosition và ensureTimeColPosition
const posStartIdx = code.indexOf('function ensureHangVePosition(table)');
if (posStartIdx !== -1) {
  const posEndIdx = code.indexOf('function mapChungTuToAirlineId(chungTuVal)');
  if (posEndIdx !== -1) {
    code = code.substring(0, posStartIdx) + code.substring(posEndIdx);
    console.log('Removed ensureHangVePosition and ensureTimeColPosition old definitions.');
  } else {
    console.error('Could not find posEndIdx!');
  }
} else {
  console.error('Could not find posStartIdx!');
}

// 6. Chèn các hàm tiện ích mới vào trước mapChungTuToAirlineId
const newUtilities = `function collapseLeftSidebar() {
  const toggleBtn = document.getElementById('menu_toggle') || document.querySelector('.menu_toggle');
  if (toggleBtn) {
    const isExpanded = document.body.classList.contains('nav-md') || !document.body.classList.contains('nav-sm');
    if (isExpanded) {
      toggleBtn.click();
    }
  }
  document.body.classList.remove('nav-md');
  document.body.classList.add('nav-sm');
}

function findHeaderIndex(headers, exactKeywords, subKeywords = []) {
  return headers.findIndex(h => {
    const txt = typeof h === 'string' ? h : h.innerText.trim().toLowerCase();
    if (exactKeywords.includes(txt)) return true;
    return subKeywords.some(sub => txt.includes(sub));
  });
}

function moveColumnNextTo(table, isTargetCol, isAnchorCol) {
  const currentHeaders = Array.from(table.querySelectorAll('thead th'));
  let targetIdx = -1;
  let anchorIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    if (isTargetCol(currentHeaders[i], i)) {
      targetIdx = i;
    } else if (isAnchorCol(currentHeaders[i], i)) {
      anchorIdx = i;
    }
  }
  if (targetIdx !== -1 && anchorIdx !== -1 && targetIdx !== anchorIdx + 1) {
    const theadTr = table.querySelector('thead tr');
    if (theadTr) {
      const thTarget = currentHeaders[targetIdx];
      const thAnchor = currentHeaders[anchorIdx];
      if (thTarget && thAnchor) {
        theadTr.insertBefore(thTarget, thAnchor.nextSibling);
      }
    }
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    rows.forEach(row => {
      const rowText = row.innerText.toLowerCase();
      if (rowText.includes('tổng cộng') || rowText.includes('cộng') || row.classList.contains('skyjet-auto-summary-row')) {
        return;
      }
      const cells = Array.from(row.cells);
      const cellTarget = cells[targetIdx];
      const cellAnchor = cells[anchorIdx];
      if (cellTarget && cellAnchor) {
        row.insertBefore(cellTarget, cellAnchor.nextSibling);
      }
    });
  }
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

`;

const mapIndex = code.indexOf('function mapChungTuToAirlineId(chungTuVal)');
if (mapIndex !== -1) {
  code = code.substring(0, mapIndex) + newUtilities + '\n' + code.substring(mapIndex);
  console.log('Inserted new common utilities and position wrappers.');
} else {
  console.error('Could not find mapChungTuToAirlineId for insertion!');
}

// 7. Thay thế findIndex bằng findHeaderIndex
const findIndexReplacements = [
  {
    old: `  let orderCodeIndex = headers.findIndex(h => {
    const text = h.innerText.trim().toLowerCase();
    return text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh');
  });`,
    new: `  let orderCodeIndex = findHeaderIndex(headers, ['mã đơn hàng'], ['đơn hàng', 'mã đh']);`
  },
  {
    old: `    soVeColIdx = headers.findIndex(h => {
      const text = h.innerText.trim().toLowerCase();
      return text === 'số vé' || text === 'so ve';
    });`,
    new: `    soVeColIdx = findHeaderIndex(headers, ['số vé', 'so ve']);`
  },
  {
    old: `  const idx = headers.findIndex(h => {
    const txt = h.innerText.trim().toLowerCase();
    return txt === 'chứng từ' || txt === 'chung tu';
  });`,
    new: `  const idx = findHeaderIndex(headers, ['chứng từ', 'chung tu']);`
  },
  {
    old: `  const idx = headers.findIndex(h => {
    const txt = h.innerText.trim().toLowerCase();
    return txt === 'hành trình' || txt === 'hanh trinh';
  });`,
    new: `  const idx = findHeaderIndex(headers, ['hành trình', 'hanh trinh']);`
  },
  {
    old: `  const passengerColIdx = headers.findIndex(h => {
    const txt = h.innerText.trim().toLowerCase();
    return txt.includes('tên khách') || txt.includes('ten khach') || txt.includes('hành khách') || txt.includes('hanh khach') || txt.includes('khách hàng') || txt.includes('khach hang');
  });`,
    new: `  const passengerColIdx = findHeaderIndex(headers, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach', 'khách hàng', 'khach hang']);`
  },
  {
    old: `  const descColIdx = headers.findIndex(h => {
    const txt = h.innerText.trim().toLowerCase();
    return txt.includes('diễn giải') || txt.includes('nội dung') || txt.includes('description');
  });`,
    new: `  const descColIdx = findHeaderIndex(headers, [], ['diễn giải', 'nội dung', 'description']);`
  },
  {
    old: `    const orderCodeIndex = headers.findIndex(h => {
      const txt = h.innerText.trim().toLowerCase();
      return txt.includes('mã đơn hàng') || txt.includes('đơn hàng') || txt.includes('mã đh');
    });`,
    new: `    const orderCodeIndex = findHeaderIndex(headers, [], ['mã đơn hàng', 'đơn hàng', 'mã đh']);`
  },
  {
    old: `  const loaiVeColIdx = headers.findIndex(h => {
    const text = h.innerText.trim().toLowerCase();
    return text === 'loại vé' || text === 'loai ve';
  });`,
    new: `  const loaiVeColIdx = findHeaderIndex(headers, ['loại vé', 'loai ve']);`
  },
  {
    old: `              let subTicketColIdx = subHeaders.findIndex(txt => txt.includes('số vé') || txt.includes('so ve'));`,
    new: `              let subTicketColIdx = findHeaderIndex(subHeaders, [], ['số vé', 'so ve']);`
  },
  {
    old: `              let subClassColIdx = subHeaders.findIndex(txt => txt === 'hạng' || txt === 'hang' || txt.includes('hạng vé'));`,
    new: `              let subClassColIdx = findHeaderIndex(subHeaders, ['hạng', 'hang'], ['hạng vé']);`
  },
  {
    old: `              let subTypeColIdx = subHeaders.findIndex(txt => txt.includes('loại vé') || txt.includes('loai ve'));`,
    new: `              let subTypeColIdx = findHeaderIndex(subHeaders, [], ['loại vé', 'loai ve']);`
  },
  {
    old: `              let subPassengerColIdx = subHeaders.findIndex(txt => txt.includes('tên khách') || txt.includes('ten khach') || txt.includes('hành khách') || txt.includes('hanh khach'));`,
    new: `              let subPassengerColIdx = findHeaderIndex(subHeaders, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach']);`
  },
  {
    old: `    const hanhTrinhColIdx2 = updatedHeaders2.findIndex(h => {
      const txt = h.innerText.trim().toLowerCase();
      return txt === 'hành trình' || txt === 'hanh trinh';
    });`,
    new: `    const hanhTrinhColIdx2 = findHeaderIndex(updatedHeaders2, ['hành trình', 'hanh trinh']);`
  },
  {
    old: `        const descColIdx = currentHeaders.findIndex(h => {
          const txt = h.innerText.trim().toLowerCase();
          return txt.includes('diễn giải') || txt.includes('nội dung') || txt.includes('description');
        });`,
    new: `        const descColIdx = findHeaderIndex(currentHeaders, [], ['diễn giải', 'nội dung', 'description']);`
  },
  {
    old: `      const passengerColIdx = updatedHeaders3.findIndex(h => {
        const txt = h.innerText.trim().toLowerCase();
        return txt.includes('tên khách') || txt.includes('ten khach') || txt.includes('hành khách') || txt.includes('hanh khach') || txt.includes('khách hàng') || txt.includes('khach hang');
      });`,
    new: `      const passengerColIdx = findHeaderIndex(updatedHeaders3, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach', 'khách hàng', 'khach hang']);`
  }
];

let replacedCount = 0;
for (const replacement of findIndexReplacements) {
  // Normalize line endings to avoid issues matching
  const normalizedOld = replacement.old.replace(/\r\n/g, '\n');
  const normalizedCode = code.replace(/\r\n/g, '\n');
  if (normalizedCode.includes(normalizedOld)) {
    code = normalizedCode.replace(normalizedOld, replacement.new);
    replacedCount++;
  } else {
    console.error(`Failed to replace a findIndex call:`, replacement.old);
  }
}
console.log(`Successfully replaced ${replacedCount} findIndex calls with findHeaderIndex.`);

fs.writeFileSync(contentJsPath, code, 'utf8');
console.log('Successfully completed refactor script.');
