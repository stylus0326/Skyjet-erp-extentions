import React from 'react';
import Simulator from './Simulator';
import DownloadPanel from './DownloadPanel';
import InstallationGuide from './InstallationGuide';
import CodeViewer from './CodeViewer';
import { ChevronRight, ArrowUpRight } from 'lucide-react';

export function ExtensionTab() {
  return (
    <div className="flex flex-col gap-8 max-w-full text-zinc-900 bg-slate-50 p-4 sm:p-6 rounded-lg">
      {/* Top subtle breadcrumb */}
      <div className="bg-white px-4 py-2 border border-slate-200 rounded-lg flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">Skyjet Extension Portal</span>
          <ChevronRight size={12} className="text-slate-400" />
          <span>AgentArea</span>
          <ChevronRight size={12} className="text-slate-400" />
          <span>Agent</span>
          <ChevronRight size={12} className="text-slate-400" />
          <span className="text-slate-850 font-semibold">SearchTransaction</span>
        </div>
        <div className="text-[10px] text-slate-450 font-mono">
          Ngày kiểm tra: 27/06/2026
        </div>
      </div>

      {/* High Density Hero Block */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full pointer-events-none translate-x-6 -translate-y-6"></div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-sky-105 text-sky-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              TIỆN ÍCH CHUYÊN DỤNG SKYJET
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              Mã hóa người dùng
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Biến Mã đơn hàng thành Nút tra cứu nhanh ngầm
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            Không cần phải rời trang hay tải lại cửa sổ! Bản Chrome Extension chuyên nghiệp giúp chuyển cột mã đơn hàng dạng văn bản thô <code>&lt;td&gt;</code> thành các nút bấm thông minh. Khi nhấn nút, chương trình tự động gửi yêu cầu tra cứu vé máy bay ngầm đến máy chủ Skyjet ERP và bộc lộ báo cáo chi tiết thông qua hộp thoại tiện lợi.
          </p>
        </div>

        <div className="flex-shrink-0 grid grid-cols-2 gap-2 text-center bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-full sm:min-w-[280px]">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-lg font-black text-slate-900">0 giây</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Chờ trang tải</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-lg font-black text-slate-900">1 click</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Vừa mắt vé</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 col-span-2">
            <div className="text-sm font-bold text-emerald-600">Đồng bộ tuyệt đối</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Thừa hưởng cookies an toàn</div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator Section Container */}
      <div id="simulator-section">
        <Simulator />
      </div>

      {/* Chrome Extension pack section */}
      <div id="download-section">
        <DownloadPanel />
      </div>

      {/* Easy Step-by-step guidebook */}
      <div id="guide-section">
        <InstallationGuide />
      </div>

      {/* Code Viewer directory browser */}
      <div id="code-viewer-section">
        <CodeViewer />
      </div>
    </div>
  );
}
