const fs = require('fs');
const path = require('path');

function main() {
  const extensionDir = path.resolve('src', 'extension');
  const dataDir = path.resolve('src', 'data');
  const dataTsPath = path.resolve('src', 'data.ts');

  console.log('[Skyjet Sync] Starting extension files synchronization...');

  // Tạo thư mục src/data nếu chưa tồn tại
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Định nghĩa danh sách các tệp tin tiện ích, mô tả và cấu hình xuất bản tương ứng
  const filesConfig = [
    {
      name: 'manifest.json',
      path: 'manifest.json',
      language: 'json',
      variableName: 'manifestFile',
      targetTsFile: 'manifest.ts',
      description: 'Tài liệu cấu hình chính của Tiện ích mở rộng Chrome (Manifest V3). Khai báo các quyền truy cập và liên kết các file mã nguồn.'
    },
    {
      name: 'global.js',
      path: 'global.js',
      language: 'javascript',
      variableName: 'globalFile',
      targetTsFile: 'global.ts',
      description: 'Script tiện ích dùng chung, quản lý trạng thái hiển thị Dashboard và MutationObserver.'
    },
    {
      name: 'search-transaction.js',
      path: 'search-transaction.js',
      language: 'javascript',
      variableName: 'searchTransactionFile',
      targetTsFile: 'searchTransaction.ts',
      description: 'Script xử lý các tính năng bổ trợ trên trang Tìm kiếm giao dịch (Tách diễn giải, Kiểm tra, Nút tìm nhanh).'
    },
    {
      name: 'agency-sales.js',
      path: 'agency-sales.js',
      language: 'javascript',
      variableName: 'agencySalesFile',
      targetTsFile: 'agencySales.ts',
      description: 'Script xử lý rút gọn chứng từ, ẩn cột mã khách hàng và cột ngày trùng trên trang Bán đại lý.'
    },
    {
      name: 'import-booking.js',
      path: 'import-booking.js',
      language: 'javascript',
      variableName: 'importBookingFile',
      targetTsFile: 'importBooking.ts',
      description: 'Script tự động điền và kích hoạt tìm kiếm nhanh trên trang FlightVN.'
    },
    {
      name: 'background.js',
      path: 'background.js',
      language: 'javascript',
      variableName: 'backgroundFile',
      targetTsFile: 'background.ts',
      description: 'Script chạy nền (Service Worker) tiếp nhận yêu cầu gửi request POST/GET chạy ngầm để lấy dữ liệu chặng bay hoặc chi tiết đơn hàng không gây tải lại trang.'
    },
    {
      name: 'inject.css',
      path: 'inject.css',
      language: 'css',
      variableName: 'injectCssFile',
      targetTsFile: 'injectCss.ts',
      description: 'Stylesheet định dạng cho các nút tìm kiếm nhanh, tooltip và popup xem nhanh đơn hàng.'
    },
    {
      name: 'popup.html',
      path: 'popup.html',
      language: 'html',
      variableName: 'popupHtmlFile',
      targetTsFile: 'popupHtml.ts',
      description: 'Giao diện popup điều khiển cấu hình tiện ích.'
    },
    {
      name: 'popup.js',
      path: 'popup.js',
      language: 'javascript',
      variableName: 'popupJsFile',
      targetTsFile: 'popupJs.ts',
      description: 'Script điều khiển các chức năng và tương tác trên màn hình popup.'
    }
  ];

  // 1. Đồng bộ từng file và tạo tệp .ts nhỏ tương ứng dưới src/data/
  filesConfig.forEach((file) => {
    const srcFilePath = path.join(extensionDir, file.path);
    if (!fs.existsSync(srcFilePath)) {
      console.error(`[Skyjet Sync] Error: File not found: ${srcFilePath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(srcFilePath, 'utf8');
    
    // Escape dấu backtick và dấu đô-la trong template literal
    const escapedContent = content
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    const fileContent = `import { ExtensionFile } from '../types';

export const ${file.variableName}: ExtensionFile = {
  name: '${file.name}',
  path: '${file.path}',
  language: '${file.language}',
  description: '${file.description}',
  content: \`${escapedContent}\`
};
`;

    const destFilePath = path.join(dataDir, file.targetTsFile);
    fs.writeFileSync(destFilePath, fileContent, 'utf8');
    console.log(`[Skyjet Sync] Generated data file: src/data/${file.targetTsFile}`);
  });

  // 2. Dựng nội dung tệp src/data.ts làm đầu mối gộp và xuất bản mảng extensionFiles
  let importsString = '';
  let arrayElementsString = '';

  filesConfig.forEach((file, index) => {
    // Tên file ts không cần đuôi .ts khi import
    const importPathWithoutExt = `./data/${file.targetTsFile.replace(/\.ts$/, '')}`;
    importsString += `import { ${file.variableName} } from '${importPathWithoutExt}';\n`;
    arrayElementsString += `  ${file.variableName}${index < filesConfig.length - 1 ? ',' : ''}\n`;
  });

  const dataTsContent = `import { ExtensionFile } from './types';
${importsString}
// Raw Chrome Extension Files to display and package
export const extensionFiles: ExtensionFile[] = [
${arrayElementsString}];
`;

  fs.writeFileSync(dataTsPath, dataTsContent, 'utf8');
  console.log('[Skyjet Sync] Successfully generated master index file: src/data.ts');
}

main();
