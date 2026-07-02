import { useState } from 'react';
import JSZip from 'jszip';
import { extensionFiles } from '../data';
import { iconBase64 } from '../iconData';
import { FolderCheck, Download, Loader2, Sparkles, FolderArchive } from 'lucide-react';

export default function DownloadPanel() {
  const [downloading, setDownloading] = useState(false);
  const [ready, setReady] = useState(false);

  const generateIconBlob = (size: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => {
          resolve(blob || new Blob());
        }, 'image/png');
      };
      img.onerror = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#2aa7dd';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        canvas.toBlob((blob) => {
          resolve(blob || new Blob());
        }, 'image/png');
      };
      img.src = iconBase64;
    });
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();

      // Append code text files
      extensionFiles.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Append icons
      const iconsFolder = zip.folder('icons')!;
      
      const blob16 = await generateIconBlob(16);
      const blob48 = await generateIconBlob(48);
      const blob128 = await generateIconBlob(128);

      iconsFolder.file('icon16.png', blob16);
      iconsFolder.file('icon48.png', blob48);
      iconsFolder.file('icon128.png', blob128);

      // Generate the package ZIP
      const content = await zip.generateAsync({ type: 'blob' });

      // Trigger standard browser download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'skyjet-erp-helper-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setReady(true);
      setTimeout(() => setReady(false), 3000);
    } catch (err) {
      console.error('Lỗi đóng gói Extension ZIP: ', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white relative shadow-md overflow-hidden">
      {/* Dynamic graphic rings */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-x-12 -translate-y-12"></div>
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-xl translate-x-12 translate-y-12"></div>

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 bg-white/20 rounded-lg text-white">
              <FolderArchive size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-100">ĐÓNG GÓI CHROME EXTENSION</span>
          </div>
          <h2 className="text-2xl font-bold">Tải xuống Tiện ích mở rộng đầy đủ</h2>
          <p className="text-slate-100 text-xs sm:text-sm mt-2 max-w-xl leading-relaxed">
            Chúng tôi tự động dựng thư mục, biên dịch mã nguồn, vẽ icon trực quan và đóng gói toàn bộ thành một tệp tin nén **ZIP** duy nhất. Bạn chỉ cần tải về, giải nén và tải lên Google Chrome để bắt đầu sử dụng.
          </p>

          {/* Directory check labels */}
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-sky-100 font-semibold">
            <span className="bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
              <FolderCheck size={12} className="text-emerald-400" /> manifest.json
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
              <FolderCheck size={12} className="text-emerald-400" /> content.js
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
              <FolderCheck size={12} className="text-emerald-400" /> background.js
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
              <FolderCheck size={12} className="text-emerald-400" /> inject.css
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
              <FolderCheck size={12} className="text-emerald-400" /> popup.html
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
              <FolderCheck size={12} className="text-emerald-400" /> popup.js
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-300" /> /icons PNG Folder (3 sizes)
            </span>
          </div>
        </div>

        {/* Download action button */}
        <div className="flex-shrink-0 self-start md:self-center">
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-sm font-bold shadow-lg transition-transform duration-200 active:scale-95 cursor-pointer min-w-[240px] ${
              ready
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-white hover:bg-slate-50 text-indigo-700'
            }`}
          >
            {downloading ? (
              <>
                <Loader2 size={18} className="animate-spin text-indigo-700" />
                <span>Đang tạo file nén ZIP...</span>
              </>
            ) : ready ? (
              <>
                <FolderCheck size={18} />
                <span>Đã tải xuống ZIP thành công!</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>TẢI TIỆN ÍCH ĐẦY ĐỦ (.ZIP)</span>
              </>
            )}
          </button>
          
          <div className="text-center mt-2">
            <span className="text-[10px] text-sky-100 opacity-80">
              * Tương thích với Chrome, Edge, Opera, CocCoc.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
