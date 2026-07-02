import { useState } from 'react';
import { extensionFiles } from '../data';
import { Copy, Check, FileCode, Info } from 'lucide-react';

export default function CodeViewer() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const file = extensionFiles[activeTab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Không thể sao chép code: ', err);
    }
  };

  return (
    <div id="code-viewer-section" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* File Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
            <FileCode size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Mã nguồn của Tiện ích mở rộng</h3>
            <p className="text-xs text-slate-500">Xem và sao chép mã nguồn chi tiết cấu tạo tiện ích</p>
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="mt-3 sm:mt-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Đã sao chép!' : 'Sao chép mã nguồn'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[500px]">
        {/* Sidebar Nav */}
        <div className="lg:border-r border-slate-200 p-4 bg-slate-50/50 flex flex-col gap-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
            DANH SÁCH FILE (.TXT)
          </div>
          {extensionFiles.map((f, index) => (
            <button
              key={f.name}
              onClick={() => {
                setActiveTab(index);
                setCopied(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === index
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{f.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                  activeTab === index ? 'bg-sky-600/50 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {f.language}
              </span>
            </button>
          ))}

          {/* Description Card */}
          <div className="mt-auto pt-6 px-2 border-t border-slate-100 hidden lg:block">
            <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-600">
              <div className="flex items-center gap-1 text-slate-800 font-bold mb-1">
                <Info size={13} className="text-slate-500" />
                <span>Mẹo nhỏ</span>
              </div>
              Bấm vào nút **Copy** để tự tạo các file tương ứng thủ công nếu bạn không muốn tải file nén ZIP.
            </div>
          </div>
        </div>

        {/* Code Content View */}
        <div className="lg:col-span-3 flex flex-col bg-slate-950 text-slate-350 min-h-[400px]">
          {/* File description header */}
          <div className="bg-slate-900/90 text-xs px-4 py-2 border-b border-slate-800 text-slate-400 italic">
            {file.description}
          </div>
          
          {/* Code pre area */}
          <div className="p-4 sm:p-6 overflow-auto font-mono text-xs leading-relaxed flex-grow">
            <pre className="text-emerald-400 select-all selection:bg-sky-600 selection:text-white whitespace-pre-wrap sm:whitespace-pre break-words sm:break-normal">
              <code>{file.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
