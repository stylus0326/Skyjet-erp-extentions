import { Download, FolderOpen, Settings, Zap, CheckCircle2, RefreshCw } from 'lucide-react';

export default function InstallationGuide() {
  const steps = [
    {
      id: 1,
      title: 'Tải và giải nén file',
      description: 'Nhấn vào nút "Tải Tiện Ích Đầy Đủ" ở trên để lưu file `skyjet-erp-helper.zip` về máy tính, sau đó nhấp chuột phải chọn Extract (Giải nén) ra một thư mục.',
      icon: <Download size={22} />,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      id: 2,
      title: 'Mở trang quản lý Tiện ích',
      description: 'Trên trình duyệt Google Chrome, truy cập địa chỉ `chrome://extensions/` hoặc click vào biểu tượng 3 chấm ở góc trên bên phải → Tiện ích mở rộng (Extensions) → Quản lý tiện ích (Manage Extensions).',
      icon: <Settings size={22} />,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      id: 3,
      title: 'Bật Chế độ nhà phát triển',
      description: 'Tại góc trên cùng bên phải màn hình quản lý Chrome Extensions, gạt nút công tắc chuyển chế độ "Developer mode" (Chế độ nhà phát triển) sang trạng thái BẬT.',
      icon: <Zap size={22} />,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      id: 4,
      title: 'Chọn "Tải tiện ích đã giải nén"',
      description: 'Tại thanh menu mới xuất hiện bên trái, nhấp chọn nút "Load unpacked" (Tải tiện ích đã giải nén) và chọn đường dẫn đến thư mục mà bạn vừa giải nén ở Bước 1.',
      icon: <FolderOpen size={22} />,
      color: 'bg-sky-50 text-sky-600 border-sky-100',
    },
  ];

  return (
    <div id="guide-section" className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-[10px] bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            HƯỚNG DẪN CÀI ĐẶT
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">
            Làm thế nào để cài đặt vào Chrome?
          </h2>
          <p className="text-sm text-slate-650 mt-1 max-w-xl mx-auto">
            Thao tác hoàn thành nhanh chóng trong vòng chưa đầy 1 phút với 4 bước đơn giản dưới đây
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex gap-4 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-sm"
            >
              {/* Step number badge */}
              <div className="absolute top-0 right-0 bg-slate-100 text-slate-400 font-black text-3xl px-3 py-1 rounded-bl-xl opacity-20">
                0{step.id}
              </div>

              {/* Icon Container */}
              <div className={`p-3 rounded-xl border h-min flex-shrink-0 ${step.color}`}>
                {step.icon}
              </div>

              {/* Step text content */}
              <div className="flex flex-col gap-1 pr-6">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Bước {step.id}</span>
                <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                <p className="text-xs text-slate-650 leading-relaxed mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Success Alert */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 sm:p-5 mt-8 flex sm:items-start gap-3">
          <div className="text-emerald-500 mt-0.5" id="success-icon-container">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h5 className="font-bold text-emerald-900 text-sm">Hoàn thành cài đặt!</h5>
            <p className="text-xs text-emerald-800 leading-relaxed mt-1">
              Bây giờ, khi bạn truy cập trang web <strong>erp.skyjet.vn</strong>, Tiện ích sẽ hoạt động ngay lập tức. Bảng tra cứu công nợ sẽ xuất hiện các nút Mã đơn hàng để bấm là ra vé ngầm tức thì!
            </p>
          </div>
        </div>

        {/* Smart Update Guide Alert */}
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 sm:p-5 mt-4 flex sm:items-start gap-3" id="quick-update-method-tip">
          <div className="text-sky-600 mt-0.5">
            <RefreshCw size={20} className="animate-spin-slow" />
          </div>
          <div className="space-y-1.5">
            <h5 className="font-bold text-sky-900 text-sm">💡 Mẹo hay: Cách cập nhật Tiện ích cực nhanh không cần cài lại!</h5>
            <p className="text-xs text-sky-850 leading-relaxed">
              Mỗi khi chúng tôi cập nhật phiên bản mới (ví dụ như thay đổi màu sắc, tính năng), bạn <strong>không cần phải gỡ đi cài lại từ đầu</strong>. Hãy làm theo 3 bước sau chỉ trong 5 giây:
            </p>
            <ol className="text-xs text-sky-800 list-decimal pl-4 space-y-1 mt-1 font-medium">
              <li>Tải tệp tin ZIP mới về máy tính.</li>
              <li>Giải nén và <strong>chép đè (Overwrite / Replace)</strong> toàn bộ các tệp tin cũ trong thư mục tiện ích hiện tại của bạn.</li>
              <li>Truy cập <code className="bg-sky-100/80 px-1 py-0.5 rounded font-mono text-[10px]">chrome://extensions/</code> và click vào nút <strong>Tải lại (Reload / Mũi tên xoay tròn ↺)</strong> ở góc dưới của thẻ tiện ích <strong>Skyjet ERP Helper</strong>.</li>
            </ol>
            <p className="text-[11px] text-sky-700 italic mt-1">
              * Sau đó chỉ cần F5 (Tải lại trang) tab Skyjet ERP đang mở là tiện ích sẽ ngay lập tức áp đặt giao diện và tính năng mới nhất!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
