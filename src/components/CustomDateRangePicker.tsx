import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDateRangePickerProps {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string;   // Format: YYYY-MM-DD
  onRangeChange: (start: string, end: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomDateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  placeholder = "Chọn khoảng ngày...",
  disabled = false
}: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // We track temporary selection inside the popup until "Áp dụng" is clicked
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Parse initial base month from tempStart, startDate or today
  const getInitialMonthState = () => {
    const target = tempStart || startDate;
    if (target) {
      const parts = target.split('-');
      if (parts.length === 3) {
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10) - 1 // 0-indexed
        };
      }
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth()
    };
  };

  const initialMonth = getInitialMonthState();
  const [baseYear, setBaseYear] = useState(initialMonth.year);
  const [baseMonth, setBaseMonth] = useState(initialMonth.month);

  // Sync temp state with props when popup opens or props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
    if (startDate) {
      const parts = startDate.split('-');
      if (parts.length === 3) {
        setBaseYear(parseInt(parts[0], 10));
        setBaseMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [startDate, endDate, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format date display for trigger button in Vietnamese
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const year = parts[0];
    return `${day} thg ${month}, ${year}`;
  };

  const getButtonText = () => {
    if (!startDate && !endDate) return placeholder;
    if (startDate && !endDate) return `${formatDateDisplay(startDate)} – ...`;
    if (!startDate && endDate) return `... – ${formatDateDisplay(endDate)}`;
    return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
  };

  // Calendar logic helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  const handlePrevMonth = () => {
    if (baseMonth === 0) {
      setBaseMonth(11);
      setBaseYear(prev => prev - 1);
    } else {
      setBaseMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (baseMonth === 11) {
      setBaseMonth(0);
      setBaseYear(prev => prev + 1);
    } else {
      setBaseMonth(prev => prev + 1);
    }
  };



  const handleDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
    } else {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRangeChange('', '');
    setTempStart('');
    setTempEnd('');
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleApply = () => {
    onRangeChange(tempStart, tempEnd);
    setIsOpen(false);
  };

  // Helper to determine day styles
  const getDayClassNames = (dateStr: string) => {
    const isSelectedStart = tempStart === dateStr;
    const isSelectedEnd = tempEnd === dateStr;
    const isToday = () => {
      const t = new Date();
      const formattedToday = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      return formattedToday === dateStr;
    };

    if (isSelectedStart) {
      return 'bg-[#4727B5] text-white font-bold rounded-full';
    }
    if (isSelectedEnd) {
      return 'bg-[#4727B5] text-white font-bold rounded-full';
    }

    if (tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd) {
      return 'text-[#8b6ff7] font-semibold';
    }

    if (tempStart && !tempEnd && hoverDate && dateStr > tempStart && dateStr <= hoverDate) {
      return 'text-[#8b6ff7] font-semibold';
    }

    if (isToday()) {
      return 'border border-[#4727B5] text-[#8b6ff7] font-semibold rounded-full';
    }

    return 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-full';
  };

  // Render individual calendar
  const renderCalendarMonth = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfWeek(year, month);
    const cells = [];

    // Empty alignment cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<div key={`empty-${month}-${i}`} className="h-7 w-7" />);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateFormatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push(
        <button
          key={`day-${month}-${d}`}
          type="button"
          onClick={() => handleDayClick(dateFormatted)}
          onMouseEnter={() => setHoverDate(dateFormatted)}
          className={`h-7 w-7 text-[10px] flex items-center justify-center transition-all cursor-pointer ${getDayClassNames(dateFormatted)}`}
        >
          {d}
        </button>
      );
    }

    const monthNames = [
      "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
      "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];

    const weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    return (
      <div className="w-52 shrink-0">
        <div className="text-xs font-bold text-center text-zinc-100 mb-2">
          {monthNames[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 justify-items-center">
          {weekdayNames.map(wd => (
            <div key={`wd-${wd}`} className="text-[10px] font-bold text-zinc-500 h-5 w-7 flex items-center justify-center">
              {wd}
            </div>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  // Determine next month values for side-by-side rendering
  const nextMonthYear = baseMonth === 11 ? baseYear + 1 : baseYear;
  const nextMonth = baseMonth === 11 ? 0 : baseMonth + 1;

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-950 text-xs text-left focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer h-9 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className={startDate || endDate ? "text-zinc-100 font-mono truncate" : "text-zinc-500 truncate"}>
            {getButtonText()}
          </span>
        </div>
        {(startDate || endDate) && !disabled && (
          <span
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Dropdown Popup Overlay */}
      {isOpen && !disabled && (
        <div className="absolute left-0 mt-1 z-50 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl p-3 flex flex-col gap-3 animate-fade-in text-zinc-100 select-none max-w-lg">

          {/* Right Panel: Calendar Grid & Actions */}
          <div className="flex-1 flex flex-col">
            
            {/* Header controls */}
            <div className="flex items-center justify-between mb-2 border-b border-zinc-900 pb-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">
                Lịch hiệu lực
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Months Container */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-start">
              {renderCalendarMonth(baseYear, baseMonth)}
              {renderCalendarMonth(nextMonthYear, nextMonth)}
            </div>

            {/* Action Footer */}
            <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between gap-3">
              <div className="text-[10px] text-zinc-400 truncate font-mono">
                {tempStart ? formatDateDisplay(tempStart) : '...'} – {tempEnd ? formatDateDisplay(tempEnd) : '...'}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-[10px] font-bold rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 text-[10px] font-bold rounded bg-[#4727B5] text-white hover:bg-[#5936d6] transition-all cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
