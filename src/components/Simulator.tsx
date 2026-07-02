import { useState, useEffect } from 'react';
import { mockTransactions, mockTicketsDb } from '../mockData';
import { ToggleLeft, ToggleRight, Sparkles, X, Plane, Search, Users, Receipt, Calendar, User, ArrowRight, Info, ArrowUpRight, Camera } from 'lucide-react';
import { TicketData } from '../types';

const fieldLabels: Record<string, { icon: string, label: string, colorClass: string }> = {
  agentId: { icon: '🏢', label: 'Đại lý', colorClass: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30' },
  pnr: { icon: '🔑', label: 'Mã PNR', colorClass: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' },
  ticketType: { icon: '🎟️', label: 'Loại vé', colorClass: 'bg-amber-950/40 text-amber-400 border-amber-900/30' },
  productType: { icon: '📦', label: 'Sản phẩm', colorClass: 'bg-teal-950/40 text-teal-400 border-teal-900/30' },
  salesChannel: { icon: '🌐', label: 'Kênh bán', colorClass: 'bg-sky-950/40 text-sky-400 border-sky-900/30' },
  itinerary: { icon: '📍', label: 'Hành trình', colorClass: 'bg-rose-950/40 text-rose-450 border-rose-900/30' },
  carrier: { icon: '✈️', label: 'Hãng bay', colorClass: 'bg-cyan-950/40 text-cyan-400 border-cyan-800/30' },
  ticketClass: { icon: '💺', label: 'Hạng đặt chỗ', colorClass: 'bg-purple-950/40 text-purple-400 border-purple-900/30' },
  supplier: { icon: '🏢', label: 'Nhà cung cấp', colorClass: 'bg-pink-950/40 text-pink-400 border-pink-900/30' },
  issueDate: { icon: '📅', label: 'Ngày xuất', colorClass: 'bg-slate-850 text-slate-350 border-slate-800' },
  bookerCode: { icon: '👤', label: 'Booker', colorClass: 'bg-blue-950/40 text-blue-300 border-blue-900/30' },
  fee: { icon: '💰', label: 'Phí dịch vụ', colorClass: 'bg-amber-950/40 text-amber-500 border-amber-900/30' },
};

export default function Simulator() {
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(true);
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ code: string; tickets: TicketData[] } | null>(null);
  const [errorModal, setErrorModal] = useState<{ code: string; message: string } | null>(null);
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null);
  
  // Element picker states
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [hoveredRect, setHoveredRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isPickerActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const simulatorEl = document.getElementById('simulator-section');
      if (!simulatorEl || !simulatorEl.contains(e.target as Node)) return;

      const el = e.target as HTMLElement;
      if (!el || el === simulatorEl) return;

      // Avoid picking the picker overlay or container itself
      if (el.classList.contains('skyjet-picker-overlay') || el.id === 'simulator-section') return;

      // Avoid picking popup close buttons or inputs directly inside controller toggles
      if (el.closest('.exclude-from-picker') || el.tagName === 'BUTTON' && el.innerText.includes('Chụp hình thẻ')) return;

      let target = el;
      // Traverse up to a reasonable sized container element
      for (let i = 0; i < 3; i++) {
        if (target.parentElement && target.parentElement !== simulatorEl && (target.clientWidth < 85 || target.clientHeight < 22)) {
          target = target.parentElement;
        } else {
          break;
        }
      }

      const rect = target.getBoundingClientRect();
      const containerRect = simulatorEl.getBoundingClientRect();

      setHoveredRect({
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height
      });
      setHoveredElement(target);
    };
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const simulatorEl = document.getElementById('simulator-section');
      if (simulatorEl) {
        const clickEl = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        if (clickEl && simulatorEl.contains(clickEl)) {
          let target = clickEl;
          for (let i = 0; i < 3; i++) {
            if (target.parentNode && target.parentNode !== simulatorEl && (target.clientWidth < 85 || target.clientHeight < 22)) {
              target = target.parentNode as HTMLElement;
            } else {
              break;
            }
          }
          captureMockElement(target);
        } else if (hoveredElement) {
          captureMockElement(hoveredElement);
        }
      } else if (hoveredElement) {
        captureMockElement(hoveredElement);
      }

      setIsPickerActive(false);
      setHoveredRect(null);
      setHoveredElement(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPickerActive(false);
        setHoveredRect(null);
        setHoveredElement(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isPickerActive, hoveredElement]);

  const captureMockElement = (el: HTMLElement) => {
    const canvas = document.createElement('canvas');
    const width = Math.max(el.clientWidth || 300, 120);
    const height = Math.max(el.clientHeight || 100, 40);
    
    // Scale for high DPI/retina quality screenshot
    const scaleVal = 2;
    canvas.width = width * scaleVal;
    canvas.height = height * scaleVal;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scaleVal, scaleVal);

    // Style background matching the premium slate interface
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0b1329'); // Deep slate
    gradient.addColorStop(1, '#1e293b'); // Medium slate
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Accent line/border
    ctx.strokeStyle = '#0284c7'; // Sky-600 border
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Metadata header stamp
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('SKYJET ERP CAPTURE', 10, 16);

    // Draw Tag type
    const tagText = el.tagName.toUpperCase();
    ctx.fillStyle = '#334155';
    ctx.fillRect(width - 65, 6, 55, 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tagText, width - 37, 14);
    ctx.textAlign = 'left';

    // Parse and render lines of inner text
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '10px monospace';
    
    const textLines = (el.innerText || el.textContent || '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    let drawY = 36;
    textLines.slice(0, 12).forEach((line) => {
      const displayLine = line.length > 45 ? line.substring(0, 42) + '...' : line;
      ctx.fillText(displayLine, 12, drawY);
      drawY += 15;
    });

    // Watermark signature info
    ctx.fillStyle = '#64748b';
    ctx.font = '7px sans-serif';
    ctx.fillText('Chụp hình thẻ tự động - Skyjet Helper', 10, height - 10);

    // Trigger download of mock captured image element representation
    const link = document.createElement('a');
    link.download = `skyjet_element_${el.tagName.toLowerCase()}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const detectCommonFields = (tickets: TicketData[]) => {
    if (!tickets || tickets.length === 0) return {};
    const first = tickets[0];
    const keysToCheck: Array<keyof TicketData> = [
      'agentId', 'pnr', 'ticketType', 'productType', 'salesChannel', 'itinerary', 'carrier', 'ticketClass', 'supplier', 'issueDate', 'bookerCode', 'fee'
    ];
    const common: Partial<Record<keyof TicketData, any>> = {};
    for (const key of keysToCheck) {
      // Check if the column is entirely blank OR entirely zero (or mix of empty and zero)
      const isColBlankOrZero = tickets.every(t => {
        const v = t[key];
        if (v === undefined || v === null) return true;
        const clean = String(v).replace(/[., đ%vN-]/gi, '').trim();
        return clean === '' || clean === '0' || /^0+$/.test(clean);
      });

      if (isColBlankOrZero) {
        const nonEmptys = tickets.map(t => String(t[key] ?? '').trim()).filter(v => v !== '');
        common[key] = nonEmptys.length > 0 ? nonEmptys[0] : '0';
        continue;
      }

      // Check if all values are exactly the same
      if (first[key] !== undefined && first[key] !== null && String(first[key]).trim() !== '') {
        const allSame = tickets.every(t => String(t[key]) === String(first[key]));
        if (allSame) {
          // If it is numerical (except for '0' which was handled above), keep it in table
          const isNumericalKey = key === 'fee';
          if (!isNumericalKey) {
            common[key] = first[key];
          }
        }
      }
    }
    return common;
  };

  const handleOrderClick = (code: string, description?: string) => {
    if (!code) return;
    setLoadingCode(code);
    
    // Extract ticket number (13 digits) if description is provided
    let ticketNum: string | null = null;
    if (description) {
      const match = description.match(/\d{13}/);
      if (match) {
        ticketNum = match[0];
      }
    }
    
    // Simulate background fetch delay
    setTimeout(() => {
      setLoadingCode(null);
      const tickets = mockTicketsDb[code];
      if (tickets && tickets.length > 0) {
        setSelectedTicketNumber(ticketNum);
        setModalData({ code, tickets });
      } else {
        setErrorModal({
          code,
          message: `Không tìm thấy dữ liệu vé nào khớp với mã đơn hàng "${code}" trong Database.`
        });
      }
    }, 800);
  };

  const getAirlines = (tickets: TicketData[]) => {
    const list: string[] = [];
    tickets.forEach(t => {
      if (t.carrier && !list.includes(t.carrier)) list.push(t.carrier);
    });
    return list.join(', ') || 'N/A';
  };

  const getItineraries = (tickets: TicketData[]) => {
    const list: string[] = [];
    tickets.forEach(t => {
      if (t.itinerary && !list.includes(t.itinerary)) list.push(t.itinerary);
    });
    return list.join(', ') || 'N/A';
  };

  const calculateSum = (tickets: TicketData[]) => {
    let sum = 0;
    tickets.forEach(t => {
      const val = parseInt(t.totalPrice.replace(/,/g, '')) || 0;
      sum += val;
    });
    return new Intl.NumberFormat('vi-VN').format(sum);
  };

  return (
    <div id="simulator-section" className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 text-white relative overflow-hidden">
      {/* Decorative stars */}
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Sparkles size={120} className="text-sky-400" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            KHU VỰC TRỰC QUAN
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Trình mô phỏng hoạt động trực tiếp</h2>
          <p className="text-xs text-slate-400">Trải nghiệm tiện ích trực tiếp ngay trên trang web trước khi tải về</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start">
          {/* Toggle Switch */}
          <div className="flex items-center gap-3 bg-slate-800/60 p-2 px-3 rounded-xl border border-slate-700/60">
            <span className="text-xs font-semibold text-slate-350">Trạng thái tiện ích:</span>
            <button
              onClick={() => setIsExtensionEnabled(!isExtensionEnabled)}
              className="flex items-center gap-1.5 focus:outline-none focus:ring-0 active:outline-none transition-colors cursor-pointer"
            >
              {isExtensionEnabled ? (
                <div className="flex items-center gap-1 text-sky-400">
                  <span className="text-xs font-bold uppercase">BẬT</span>
                  <ToggleRight size={38} className="text-sky-500" />
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-500">
                  <span className="text-xs font-bold uppercase text-slate-400">TẮT</span>
                  <ToggleLeft size={38} />
                </div>
              )}
            </button>
          </div>

          {/* Element Picker Button */}
          {isExtensionEnabled && (
            <button
              onClick={() => setIsPickerActive(!isPickerActive)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                isPickerActive
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-450 hover:bg-rose-900/60 hover:text-rose-400 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-750 text-sky-400 border-slate-700/80 hover:text-sky-350 shadow-md'
              }`}
            >
              <Camera size={14} />
              <span>{isPickerActive ? 'Hủy chọn (ESC)' : 'Chụp hình thẻ'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Simulator Interface Container (Mocks erp.skyjet.vn) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        {/* Mock ERP Bar */}
        <div className="bg-[#2a3f54] text-xs py-2.5 px-4 flex items-center justify-between text-slate-300 font-semibold border-b border-slate-900">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500 text-white font-extrabold text-[9px] px-1 py-0.5 rounded">ERP</span>
            <span className="text-white text-xs">erp.skyjet.vn/AgentArea/Agent/SearchTransaction?&amp;i=8</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-emerald-400 font-bold">&#x25cf; Đã kết nối đầu kỳ</span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-white font-mono">NV0055</span>
          </div>
        </div>

        {/* ERP Main Body */}
        <div className="p-4 sm:p-6 bg-slate-950/40">
          {/* Header titles */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-200">Danh sách công nợ hiện tại</h4>
            <p className="text-[10px] text-slate-500">Dữ liệu hiển thị của phòng vé: <b className="text-rose-400">PHÒNG VÉ AN SKY</b></p>
          </div>

          {/* Table wrapper */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-900/60 max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="p-3 text-center w-12">STT</th>
                  {!isExtensionEnabled && <th className="p-3">Mã KH</th>}
                  <th className="p-3">Chứng từ</th>
                  <th className="p-3">Ngày Chứng từ</th>
                  <th className="p-3">Ngày xuất</th>
                  <th className="p-3 text-sky-400">Mã đơn hàng</th>
                  <th className="p-3">Diễn giải</th>
                  <th className="p-3 text-right">Nợ (VNĐ)</th>
                  <th className="p-3 text-right">Có (VNĐ)</th>
                  <th className="p-3 text-right">Lũy kế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {mockTransactions.map((tx) => (
                  <tr key={tx.stt} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-mono">{tx.stt}</td>
                    {!isExtensionEnabled && <td className="p-3 text-slate-450 font-mono font-medium text-amber-500/90">{tx.agentId}</td>}
                    <td className="p-3 text-slate-400 font-mono">{tx.documentType}</td>
                    <td className="p-3 text-slate-400 font-mono">{tx.documentDate}</td>
                    <td className="p-3 text-slate-400 font-mono">
                      {isExtensionEnabled && tx.issueDate === '01/01/1900' ? '' : tx.issueDate}
                    </td>
                    
                    {/* Interactive Code Cell */}
                    <td className="p-3 font-semibold font-mono">
                      {tx.orderCode ? (
                        isExtensionEnabled ? (
                          <button
                            onClick={() => handleOrderClick(tx.orderCode, tx.description)}
                            disabled={loadingCode !== null}
                            className={`inline-flex items-center justify-center w-[78px] min-w-[78px] h-7 bg-[rgb(23,162,184)] hover:bg-[rgb(19,132,150)] text-white rounded text-[11px] font-bold shadow-xs transition-all animate-fade-in ${
                              loadingCode === tx.orderCode ? 'opacity-80 scale-95' : 'hover:-translate-y-0.5 active:translate-y-0'
                            }`}
                          >
                            {loadingCode === tx.orderCode && (
                              <svg className="animate-spin h-3 w-3 text-white mr-1.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            <span>{tx.orderCode}</span>
                          </button>
                        ) : (
                          <span className="text-slate-200 hover:underline cursor-text">{tx.orderCode}</span>
                        )
                      ) : (
                        <span className="text-slate-650">—</span>
                      )}
                    </td>

                    <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-350">{tx.debit}</td>
                    <td className="p-3 text-right font-mono text-slate-350">{tx.credit}</td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-semibold">{tx.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Notice Tip */}
          {isExtensionEnabled ? (
            <p className="text-[11px] text-sky-400 mt-3 flex items-center gap-1.5 animate-pulse bg-sky-950/30 p-2.5 rounded-lg border border-sky-900/30">
              <Sparkles size={12} />
              <span>Tiện ích đang giả lập: Hãy bấm thử nút <b>EFPE7N</b> hoặc <b>E6F77K</b> ở cột Mã đơn hàng để nhận báo cáo ngầm tức thì!</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
              <Info size={12} />
              <span>Tiện ích đang TẮT: Cột mã số đơn hàng chỉ là dạng chữ thuần. Bật tiện ích lên để trải nghiệm.</span>
            </p>
          )}
        </div>
      </div>

      {/* RENDER MODAL SIMULATION OVERLAY */}
      {modalData && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-[95vw] xl:max-w-[1400px] w-full max-h-[92vh] rounded-xl overflow-hidden shadow-2xl flex flex-col scale-100 animate-scale-in">
            {/* Modal Header */}
            <div className="bg-[#2a3f54] border-b border-slate-950 px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plane size={16} className="text-sky-400" />
                <span>Chi tiết báo cáo vé cho Mã đơn hàng: {modalData.code}</span>
              </h3>
              <button
                onClick={() => setModalData(null)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-grow bg-slate-950/40">
              {/* Dynamic Common Data Minimization */}
              {(() => {
                const common = detectCommonFields(rowsWithoutSummary(modalData.tickets));
                if (modalData.tickets.length <= 1 || Object.keys(common).length === 0) return null;
                return (
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg mb-4">
                    <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span>DỮ LIỆU ĐỒNG BỘ CHUNG (Đã tối ưu ẩn khỏi bảng bên dưới để tránh lặp dư thừa):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(common).map(([key, val]) => {
                        const meta = fieldLabels[key] || { icon: '📝', label: key, colorClass: 'bg-slate-800 text-slate-350 border-slate-700' };
                        return (
                          <div key={key} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border leading-none font-medium ${meta.colorClass}`}>
                            <span>{meta.icon}</span>
                            <span className="text-slate-450 font-normal">{meta.label}:</span>
                            <span className="font-bold">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Tickets List table */}
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ArrowRight size={12} className="text-sky-400" />
                {modalData.tickets.length === 1 ? 'Báo cáo chi tiết vé đơn hàng (Tối ưu dạng thẻ gọn):' : 'Danh sách chi tiết các vé được tìm thấy ngầm:'}
              </h5>
              
              {modalData.tickets.length === 1 ? (
                /* Redesigned Single Ticket Compact Layout */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                  {/* Left Column: General Info */}
                  <div className="space-y-3">
                    <h6 className="text-[11px] font-extrabold text-sky-450 uppercase tracking-widest border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                      <User size={13} className="text-sky-450" />
                      <span>Thông tin vé &amp; Hành khách</span>
                    </h6>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Mã PNR</span>
                        <span className="text-emerald-400 font-mono font-bold bg-emerald-950/45 px-2 py-0.5 rounded border border-emerald-900/40 text-xs">{modalData.tickets[0].pnr || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Số vé</span>
                        <span className="text-sky-450 font-mono font-bold">{modalData.tickets[0].ticketNumber || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Hành khách / Ghi chú</span>
                        <span className="text-slate-200 font-semibold text-right max-w-[200px] truncate">{modalData.tickets[0].notes || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Hãng bay</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          modalData.tickets[0].carrier === 'VN' ? 'bg-cyan-950/50 text-sky-400 border border-cyan-800/30' : 'bg-rose-950/50 text-rose-450 border border-rose-800/30'
                        }`}>
                          {modalData.tickets[0].carrier || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Hành trình</span>
                        <span className="text-rose-450 font-mono font-bold">{modalData.tickets[0].itinerary || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Hạng chỗ</span>
                        <span className="text-slate-300 font-mono font-bold text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{modalData.tickets[0].ticketClass || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Ngày xuất</span>
                        <span className="text-slate-300 font-mono">{modalData.tickets[0].issueDate || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Nhà cung cấp</span>
                        <span className="text-slate-300 font-bold">{modalData.tickets[0].supplier || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Booker</span>
                        <span className="text-slate-350 font-mono">{modalData.tickets[0].bookerCode || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financial Data */}
                  <div className="space-y-3">
                    <h6 className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                      <Receipt size={13} className="text-emerald-400" />
                      <span>Thông tin tài chính &amp; Thanh toán</span>
                    </h6>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Giá bán</span>
                        <span className="text-slate-350 font-mono">{modalData.tickets[0].price || "0"} vnđ</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Thuế</span>
                        <span className="text-slate-350 font-mono">{modalData.tickets[0].tax || "0"} vnđ</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Phí hãng</span>
                        <span className="text-slate-350 font-mono">{modalData.tickets[0].fee || "0"} vnđ</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Thuế VAT</span>
                        <span className="text-slate-350 font-mono">{modalData.tickets[0].vatAmount || "0"} ({modalData.tickets[0].vatRate || "0%"})</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Tạm tính</span>
                        <span className="text-slate-350 font-mono">{modalData.tickets[0].provisionalPrice || "0"} vnđ</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-800/60">
                        <span className="text-slate-400 font-medium">Phí dịch vụ</span>
                        <span className="text-slate-350 font-mono">{modalData.tickets[0].serviceFee || "0"} vnđ</span>
                      </div>
                      
                      {/* Highlighted Total Price Card */}
                      <div className="bg-emerald-950/20 border-l-4 border-l-emerald-500 p-2.5 rounded-xl border border-slate-800/80 mt-1.5">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Tổng số tiền thanh toán</span>
                            <span className="text-[#10b981] font-mono font-black text-lg">{modalData.tickets[0].totalPrice || "0"} <span className="text-xs font-normal">vnđ</span></span>
                          </div>
                          {modalData.tickets[0].supplierPrice && (
                            <div className="text-right">
                              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-0.5">Giá NET Nhà Cung Cấp</span>
                              <span className="text-slate-300 font-mono font-bold text-sm w-full">{modalData.tickets[0].supplierPrice} vnđ</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Original table display for historical multiples */
                <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-900">
                  {(() => {
                    const common = detectCommonFields(rowsWithoutSummary(modalData.tickets));
                    const showCarrier = !('carrier' in common);
                    const showItinerary = !('itinerary' in common);
                    const showClass = !('ticketClass' in common);
                    const showIssueDate = !('issueDate' in common);
                    const showBooker = !('bookerCode' in common);
                    const showFee = !('fee' in common);

                    return (
                      <table className="w-full text-left text-[11px] border-collapse min-w-[700px] whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400 font-semibold whitespace-nowrap">
                            <th className="p-3 text-center w-12 whitespace-nowrap">STT</th>
                            <th className="p-3 whitespace-nowrap">Số vé</th>
                            {showCarrier && <th className="p-3 whitespace-nowrap">Hãng</th>}
                            <th className="p-3 whitespace-nowrap">Hành khách</th>
                            {showItinerary && <th className="p-3 whitespace-nowrap">Hành trình</th>}
                            {showClass && <th className="p-3 text-center whitespace-nowrap">Hạng</th>}
                            {showIssueDate && <th className="p-3 text-center whitespace-nowrap">Ngày xuất</th>}
                            {showFee && <th className="p-3 text-right whitespace-nowrap">Phí DV</th>}
                            <th className="text-right p-3 whitespace-nowrap">Tổng tiền</th>
                            {showBooker && <th className="text-center p-3 whitespace-nowrap">Booker</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {rowsWithoutSummary(modalData.tickets).map((ticket) => {
                            const isSelected = selectedTicketNumber && ticket.ticketNumber === selectedTicketNumber;
                            return (
                              <tr
                                key={ticket.id}
                                className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors whitespace-nowrap ${
                                  isSelected ? 'bg-amber-500/15 border-l-4 border-l-amber-500 font-semibold text-slate-100' : ''
                                }`}
                              >
                                <td className="p-3 text-center text-slate-500 font-mono whitespace-nowrap">{ticket.stt}</td>
                                <td className="p-3 font-mono font-semibold whitespace-nowrap">
                                  {isSelected ? (
                                    <span className="flex items-center gap-1.5 text-amber-400 font-extrabold">
                                      <span>{ticket.ticketNumber}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-200">{ticket.ticketNumber}</span>
                                  )}
                                </td>
                              
                              {showCarrier && (
                                <td className="p-3 font-bold whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                                    ticket.carrier === 'VN' ? 'bg-cyan-950/50 text-sky-400 border border-cyan-800/30' : 'bg-rose-950/50 text-rose-450 border border-rose-800/30'
                                  }`}>
                                    {ticket.carrier}
                                  </span>
                                </td>
                              )}

                              <td className="p-3 font-semibold text-slate-200 whitespace-normal break-words max-w-[180px] leading-tight">
                                <span className="flex items-start gap-1.5">
                                  <User size={11} className="text-slate-500 shrink-0 mt-0.5" />
                                  <span title={ticket.notes}>{ticket.notes}</span>
                                </span>
                              </td>

                              {showItinerary && <td className="p-3 font-mono font-medium text-slate-350 whitespace-nowrap">{ticket.itinerary}</td>}
                              
                              {showClass && (
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span className="bg-slate-800 px-1.5 py-0.2 rounded text-slate-400 font-mono text-[9px]">{ticket.ticketClass}</span>
                                </td>
                              )}

                              {showIssueDate && <td className="p-3 text-center text-slate-400 font-mono whitespace-nowrap">{ticket.issueDate}</td>}
                              
                              {showFee && <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">{ticket.fee}</td>}
                              <td className="p-3 text-right font-mono text-emerald-400 font-bold whitespace-nowrap">{ticket.totalPrice}</td>
                              
                              {showBooker && <td className="p-3 text-center font-mono text-slate-400 whitespace-nowrap">{ticket.bookerCode}</td>}
                            </tr>
                            );
                          })}
                          {/* Summary Sum Row in Simulator modal */}
                          {(() => {
                            const totalFee = modalData.tickets.reduce((acc, t) => acc + (parseInt(t.fee.replace(/[^0-9]/g, '')) || 0), 0);
                            const totalPriceSum = modalData.tickets.reduce((acc, t) => acc + (parseInt(t.totalPrice.replace(/[^0-9]/g, '')) || 0), 0);
                            const formattedTotalFee = new Intl.NumberFormat('vi-VN').format(totalFee);
                            const formattedTotalPrice = new Intl.NumberFormat('vi-VN').format(totalPriceSum);

                            return (
                              <tr className="bg-slate-900 border-t-2 border-slate-800 text-[11px] font-bold whitespace-nowrap">
                                <td className="p-3 text-center text-sky-400 text-sm font-extrabold whitespace-nowrap">∑</td>
                                <td className="p-3 text-slate-300 whitespace-nowrap">Tổng cộng</td>
                                {showCarrier && <td className="p-3 whitespace-nowrap"></td>}
                                <td className="p-3 whitespace-nowrap"></td>
                                {showItinerary && <td className="p-3 whitespace-nowrap"></td>}
                                {showClass && <td className="p-3 whitespace-nowrap"></td>}
                                {showIssueDate && <td className="p-3 whitespace-nowrap"></td>}
                                {showFee && <td className="p-3 text-right font-mono text-slate-300 whitespace-nowrap">{formattedTotalFee}</td>}
                                <td className="p-3 text-right font-mono text-emerald-400 whitespace-nowrap">{formattedTotalPrice}</td>
                                {showBooker && <td className="p-3 whitespace-nowrap"></td>}
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-end gap-3">
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <a
                  href={`https://erp.skyjet.vn/OrderReportArea/OrderReport/SearchAllOrder?&i=13&OrderReferenceId=${encodeURIComponent(modalData.code)}${selectedTicketNumber ? `&TicketNumber=${selectedTicketNumber}` : ''}&skyjet_hide_nav=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <ArrowUpRight size={14} />
                  <span>Mở đơn hàng gốc</span>
                </a>
                <button
                  onClick={() => setModalData(null)}
                  className="px-5 py-2 bg-slate-700 hover:bg-slate-650 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer text-center shrink-0"
                >
                  Đóng thông tin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ERROR MODAL */}
      {errorModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl max-w-sm w-full text-center shadow-2xl relative">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-3 border border-rose-800/20">
              <X size={20} />
            </div>
            <h4 className="font-bold text-slate-100 text-sm">Hệ thống thông báo</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">{errorModal.message}</p>
            <button
              onClick={() => setErrorModal(null)}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Đóng thông bão
            </button>
          </div>
        </div>
      )}
      {/* Visual selection highlight overlay for Simulated Element Picker */}
      {isPickerActive && hoveredRect && (
        <div
          className="absolute z-40 pointer-events-none border-2 border-dashed border-sky-400 bg-sky-500/10 transition-all duration-75 flex items-end justify-end skyjet-picker-overlay shadow-lg"
          style={{
            left: hoveredRect.left,
            top: hoveredRect.top,
            width: hoveredRect.width,
            height: hoveredRect.height,
          }}
        >
          <span className="bg-sky-600 text-[9px] text-white px-1.5 py-0.5 font-bold rounded-tl uppercase leading-none border-t border-l border-sky-400">
            {hoveredElement?.tagName.toLowerCase() || 'element'}
          </span>
        </div>
      )}
    </div>
  );
}

// Utility to skip custom totals summary line if in list
function rowsWithoutSummary(tickets: TicketData[]) {
  return tickets;
}
