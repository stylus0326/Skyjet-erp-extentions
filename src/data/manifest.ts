import { ExtensionFile } from '../types';

export const manifestFile: ExtensionFile = {
  name: 'manifest.json',
  path: 'manifest.json',
  language: 'json',
  description: 'Tài liệu cấu hình chính của Tiện ích mở rộng Chrome (Manifest V3). Khai báo các quyền truy cập và liên kết các file mã nguồn.',
  content: `{
  "manifest_version": 3,
  "name": "Skyjet ERP Helper",
  "version": "26.702.1",
  "description": "Biến Mã đơn hàng trong bảng công nợ Skyjet ERP thành nút tìm kiếm nhanh chạy ngầm.",
  "permissions": [
    "activeTab",
    "storage",
    "tabs",
    "cookies",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>",
    "*://erp.skyjet.vn/*",
    "*://flightvn.com/*",
    "*://*.flightvn.com/*",
    "https://*.supabase.co/*"
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
      "js": [
        "global.js",
        "search-transaction.js",
        "agency-sales.js"
      ],
      "css": [
        "inject.css"
      ],
      "run_at": "document_end"
    },
    {
      "matches": [
        "https://flightvn.com/Booking/ImportBooking*",
        "https://*.flightvn.com/Booking/ImportBooking*"
      ],
      "js": [
        "global.js",
        "import-booking.js"
      ],
      "css": [
        "inject.css"
      ],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "index.html",
        "assets/*"
      ],
      "matches": [
        "*://erp.skyjet.vn/*"
      ]
    }
  ]
}
`
};
