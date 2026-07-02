const fs = require('fs');
const path = require('path');

const contentJsPath = path.resolve('scratch', 'extracted', 'content.js');
const code = fs.readFileSync(contentJsPath, 'utf8');
const lines = code.split('\n');

// Định nghĩa khoảng dòng (1-indexed, bao gồm cả hai đầu) cho các module
const globalRanges = [
  [1, 47], // Header & MutationObserver
  [48, 107], // initSkyjetHelper
  [110, 123], // getStableTitle
  [124, 162], // chrome.runtime.onMessage.addListener
  [163, 868], // Element picker & screenshot tools
  [869, 1004], // applyVisibilitySettings
  [2695, 2750], // collapseLeftSidebar, findHeaderIndex, moveColumnNextTo
];

const searchTransactionRanges = [
  [1043, 1164], // handleSearchTransactionQuery
  [1488, 2694], // handleSearchTransactionCheck, getTicketNumFromRow, performTransactionChecking
  [2751, 2974], // Column positioning, airline matching, itinerary parsing, passenger matching
  [2975, 3773], // processTransactionTable, decorateRows, fetchOrderData, modal UI render
  [3774, 3992], // handleSplitDescription, applySplitDescription, cleanItinerary, revertSplitDescription
];

const agencySalesRanges = [
  [1005, 1041], // convertToYmd
  [1166, 1249], // processAgencySalesTable
  [1250, 1285], // removeCustomerCodeColumn
  [1286, 1368], // hideDuplicateDates
  [1369, 1424], // shortenDocumentPrefix
];

const importBookingRanges = [
  [1425, 1487], // handleAutoSearchQuery
];

function extractRanges(linesArray, ranges) {
  let result = '';
  ranges.forEach(([start, end]) => {
    // Convert 1-indexed to 0-indexed slice
    const chunk = linesArray.slice(start - 1, end).join('\n');
    result += chunk + '\n\n';
  });
  return result.trim() + '\n';
}

const targetDir = path.resolve('src', 'extension');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Tạo file global.js với initSkyjetHelper được cập nhật an toàn
let globalJsContent = extractRanges(lines, globalRanges);
// Cập nhật initSkyjetHelper để gọi các hàm an toàn (kiểm tra typeof === 'function')
globalJsContent = globalJsContent.replace(
  `  handleAutoSearchQuery();
  handleSearchTransactionQuery();
  processTransactionTable();
  processAgencySalesTable();
  removeCustomerCodeColumn();
  hideDuplicateDates();
  shortenDocumentPrefix();
  handleSearchTransactionCheck();
  handleSplitDescription();`,
  `  if (typeof handleAutoSearchQuery === 'function') handleAutoSearchQuery();
  if (typeof handleSearchTransactionQuery === 'function') handleSearchTransactionQuery();
  if (typeof processTransactionTable === 'function') processTransactionTable();
  if (typeof processAgencySalesTable === 'function') processAgencySalesTable();
  if (typeof removeCustomerCodeColumn === 'function') removeCustomerCodeColumn();
  if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
  if (typeof shortenDocumentPrefix === 'function') shortenDocumentPrefix();
  if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
  if (typeof handleSplitDescription === 'function') handleSplitDescription();`
);

globalJsContent = globalJsContent.replace(
  `  setInterval(() => {
    processTransactionTable();
    processAgencySalesTable();
    removeCustomerCodeColumn();
    hideDuplicateDates();
    shortenDocumentPrefix();
    handleSearchTransactionCheck();
    handleSplitDescription();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      applyVisibilitySettings();
    }
  }, 1500);`,
  `  setInterval(() => {
    if (typeof processTransactionTable === 'function') processTransactionTable();
    if (typeof processAgencySalesTable === 'function') processAgencySalesTable();
    if (typeof removeCustomerCodeColumn === 'function') removeCustomerCodeColumn();
    if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
    if (typeof shortenDocumentPrefix === 'function') shortenDocumentPrefix();
    if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
    if (typeof handleSplitDescription === 'function') handleSplitDescription();
    if (typeof applyVisibilitySettings === 'function') {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        applyVisibilitySettings();
      }
    }
  }, 1500);`
);

// Cập nhật MutationObserver callback an toàn
globalJsContent = globalJsContent.replace(
  `  if (shouldProcess) {
    // Tránh trùng lặp tài nguyên bằng cách debounce nhẹ
    clearTimeout(window.skyjetTimeout);
    window.skyjetTimeout = setTimeout(processTransactionTable, 150);
  }`,
  `  if (shouldProcess) {
    // Tránh trùng lặp tài nguyên bằng cách debounce nhẹ
    clearTimeout(window.skyjetTimeout);
    window.skyjetTimeout = setTimeout(() => {
      if (typeof processTransactionTable === 'function') processTransactionTable();
      if (typeof processAgencySalesTable === 'function') processAgencySalesTable();
      if (typeof removeCustomerCodeColumn === 'function') removeCustomerCodeColumn();
      if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
      if (typeof shortenDocumentPrefix === 'function') shortenDocumentPrefix();
      if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
      if (typeof handleSplitDescription === 'function') handleSplitDescription();
    }, 150);
  }`
);

// Cập nhật chrome message listener an toàn
globalJsContent = globalJsContent.replace(
  `    } else if (message.action === 'update_split_desc') {
      handleSplitDescription();
      sendResponse({ success: true });
    } else if (message.action === 'update_auto_download') {
      handleSearchTransactionCheck();
      sendResponse({ success: true });
    }`,
  `    } else if (message.action === 'update_split_desc') {
      if (typeof handleSplitDescription === 'function') handleSplitDescription();
      sendResponse({ success: true });
    } else if (message.action === 'update_auto_download') {
      if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
      sendResponse({ success: true });
    }`
);

fs.writeFileSync(path.join(targetDir, 'global.js'), globalJsContent, 'utf8');
console.log('Saved global.js');

// 2. Tạo file search-transaction.js
const searchTransactionContent = extractRanges(lines, searchTransactionRanges);
fs.writeFileSync(path.join(targetDir, 'search-transaction.js'), searchTransactionContent, 'utf8');
console.log('Saved search-transaction.js');

// 3. Tạo file agency-sales.js
const agencySalesContent = extractRanges(lines, agencySalesRanges);
fs.writeFileSync(path.join(targetDir, 'agency-sales.js'), agencySalesContent, 'utf8');
console.log('Saved agency-sales.js');

// 4. Tạo file import-booking.js
const importBookingContent = extractRanges(lines, importBookingRanges);
fs.writeFileSync(path.join(targetDir, 'import-booking.js'), importBookingContent, 'utf8');
console.log('Saved import-booking.js');

// 5. Copy background.js và inject.css và tạo manifest.json mới
const bgSrc = path.resolve('scratch', 'extracted', 'background.js');
const cssSrc = path.resolve('scratch', 'extracted', 'inject.css');
if (fs.existsSync(bgSrc)) {
  fs.copyFileSync(bgSrc, path.join(targetDir, 'background.js'));
  console.log('Copied background.js');
}
if (fs.existsSync(cssSrc)) {
  fs.copyFileSync(cssSrc, path.join(targetDir, 'inject.css'));
  console.log('Copied inject.css');
}

const manifestNew = {
  "manifest_version": 3,
  "name": "Skyjet ERP Helper",
  "version": "1.1.222",
  "description": "Biến Mã đơn hàng trong bảng công nợ Skyjet ERP thành nút tìm kiếm nhanh chạy ngầm.",
  "permissions": [
    "activeTab",
    "storage",
    "tabs",
    "cookies",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://erp.skyjet.vn/*",
    "*://*.vietnamairlines.com/*",
    "*://flightvn.com/*",
    "*://*.flightvn.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon48.png"
  },
  "content_scripts": [
    {
      "matches": [
        "https://erp.skyjet.vn/*",
        "http://erp.skyjet.vn/*"
      ],
      "js": ["global.js", "search-transaction.js", "agency-sales.js"],
      "css": ["inject.css"],
      "run_at": "document_end"
    },
    {
      "matches": [
        "https://flightvn.com/Booking/ImportBooking*",
        "https://*.flightvn.com/Booking/ImportBooking*"
      ],
      "js": ["global.js", "import-booking.js"],
      "css": ["inject.css"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
};

fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifestNew, null, 2), 'utf8');
console.log('Saved manifest.json');
console.log('Split content process completed successfully.');
